import queue
import threading
import numpy as np
from typing import Optional
import ffmpeg# type: ignore
import re
import logging
from time import sleep, time

class Client():
    _stream = None

    def __init__(self, input, verbose=False, format='bgr24',
                 read_timeout: float = 5.0, freeze_threshold: float = 10.0):
        """
            input: the video path
            verbose: print logging or not
            format: Pixel format
            read_timeout: Timeout in seconds for reading a single frame
            freeze_threshold: Seconds without new frame before considering frozen
        """
        self.input = input
        self._verbose = verbose
        self.last_time = time()
        self.read_timeout = read_timeout
        self.freeze_threshold = freeze_threshold
        self._stream = None
        self.process = None
        self.format = format

        # Frame tracking
        self.cl_channels = 3
        self.packet_size: Optional[int] = None
        self.last_frame_time = time()
        self.frame_count = 0
        self.consecutive_failures = 0
        self.max_consecutive_failures = 5
        
        self.open()

    def __exit__(self, type=None, value=None, traceback=None):
        """ Together with __enter__, allows support for `with-` clauses. """
        self.close()

    def open(self):
        if self.isOpened():
            return
        try:
            probe = ffmpeg.probe(self.input)
            self._stream = next((stream for stream in probe['streams'] if stream['codec_type'] == 'video'), None)
            
            if self._stream is None:
                raise ValueError(f"No video stream found in {self.input}")
            
            self.width = int(self._stream['width'])
            self.height = int(self._stream['height'])
            self.cl_channels = 3

            # Calculate FPS
            fps_str = self._stream.get('r_frame_rate', '30/1')
            num, den = map(int, fps_str.split('/'))
            self.fps = 5
            # self.fps = num / den if den != 0 else 30.0

            self.packet_size = self.width * self.height * self.cl_channels

            # Start ffmpeg with additional options for stability
            self.process = (ffmpeg.input(self.input, 
                       **{'analyzeduration': '10M', 
                          'probesize': '10M',
                          'fflags': '+genpts+igndts'})  # For RTSP streams
                .output('pipe:', format='rawvideo', pix_fmt=self.format, r=self.fps)
                .run_async(pipe_stdout=True, pipe_stderr=True)
            )
            self.last_frame_time = time()
            self.consecutive_failures = 0

            if self._verbose:
                logging.info(f"Opened stream: {self.input} ({self.width}x{self.height} @ {self.fps:.2f}fps)")
            print(f"Connected successfully. Resolution: {self.width}x{self.height}")
            return self
        
        except ffmpeg.Error as e:
            error_msg = e.stderr.decode('utf8') if e.stderr else str(e)
            logging.error(f'FFmpeg error: {error_msg}')
            print(f"Connection failed: {error_msg}")
            self.process = None
            
            if self.attempt < self.reconnect_attempts - 1:
                self.attempt += 1
                print(f"Retrying in 3 seconds...")
                sleep(3)
                self.open()
            else:
                raise e

    def close(self):
        """Close stream and cleanup."""
        if self.process is not None:
            try:
                self.process.stdout.close()
                self.process.stderr.close()
                self.process.terminate()
                self.process.wait(timeout=3)
            except:
                try:
                    self.process.kill()
                except:
                    pass
            finally:
                self.process = None
            
            if self._verbose:
                logging.info(f"Closed stream: {self.input}")

    def read_with_timeout(self) -> Optional[bytes]:
        """Read frame data with timeout."""
        result_queue = queue.Queue()
        
        def read_worker():
            try:
                data = self.process.stdout.read(self.packet_size)
                result_queue.put(('success', data))
            except Exception as e:
                result_queue.put(('error', e))
        
        thread = threading.Thread(target=read_worker, daemon=True)
        thread.start()
        
        try:
            status, result = result_queue.get(timeout=self.read_timeout)
            if status == 'success':
                return result
            else:
                raise result
        except queue.Empty:
            logging.warning(f"Frame read timeout after {self.read_timeout}s")
            return None

    def is_frozen(self) -> bool:
        """Check if stream appears frozen."""
        elapsed = time() - self.last_frame_time
        if elapsed > self.freeze_threshold:
            if self._verbose:
                logging.warning(f"Stream frozen for {elapsed:.1f}s")
            return True
        return False
    
    def isOpened(self) -> bool:
        """Check if stream is open."""
        return self.process is not None and self.process.poll() is None

    def read(self) -> Optional[np.ndarray]:
        """Read next frame with freeze detection."""
        if not self.isOpened():
            if self._verbose:
                logging.warning("Stream not opened")
            return None
        
        # Check for freeze
        if self.is_frozen():
            logging.error("Stream appears frozen, attempting restart...")
            self.restart()
            return None
        
        try:
            # Read with timeout
            packet = self.read_with_timeout()
            
            if packet is None:
                self.consecutive_failures += 1
                logging.warning(f"Failed to read frame. Consecutive failures: {self.consecutive_failures}")
                if self.consecutive_failures >= self.max_consecutive_failures:
                    logging.error("Too many consecutive failures, restarting stream...")
                    self.restart()
                return None
            # Validate packet size
            if len(packet) != self.packet_size:
                if len(packet) == 0:
                    if self._verbose:
                        logging.info("End of stream")
                    return None
                else:
                    logging.warning(f"Incomplete frame: {len(packet)}/{self.packet_size} bytes")
                    self.consecutive_failures += 1
                    return None
            
            # Convert to numpy array
            frame = np.frombuffer(packet, np.uint8).reshape(
                (self.height, self.width, self.cl_channels)
            )
            
            # Success - reset counters
            self.last_frame_time = time()
            self.frame_count += 1
            self.consecutive_failures = 0
            
            return frame
            
        except Exception as e:
            logging.error(f"Error reading frame: {e}")
            self.consecutive_failures += 1
            if self.consecutive_failures >= self.max_consecutive_failures:
                logging.error("Too many consecutive failures, restarting stream...")
                self.restart()
            return None
        
    def restart(self):
        """Restart the stream connection."""
        if self._verbose:
            logging.info("Restarting stream...")
        
        self.close()
        try:
            self.open()
            if self._verbose:
                logging.info("Stream restarted successfully")
        except Exception as e:
            logging.error(f"Failed to restart stream: {e}")
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False