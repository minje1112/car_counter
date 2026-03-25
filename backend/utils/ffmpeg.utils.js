const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;

// Set ffmpeg path if needed (Windows)
// ffmpeg.setFfmpegPath('C:\\ffmpeg\\bin\\ffmpeg.exe');

/**
 * Capture snapshot from RTSP stream using ffmpeg
 * @param {string} rtspUrl - RTSP stream URL
 * @param {string} outputPath - Output file path
 * @param {object} options - Snapshot options (width, height, quality)
 * @returns {Promise<string>} - Path to saved snapshot
 */
async function captureSnapshot(rtspUrl, outputPath, options = {}) {
  const {
    width = 1920,
    height = 1080,
    quality = 2, // 1-31 (lower is better quality)
  } = options;

  return new Promise((resolve, reject) => {
    ffmpeg(rtspUrl)
      .inputOptions([
        '-rtsp_transport', 'tcp',
        '-analyzeduration', '5000000',
        '-probesize', '5000000',
      ])
      .outputOptions([
        '-vframes', '1',
        '-q:v', quality.toString(),
        '-s', `${width}x${height}`,
      ])
      .output(outputPath)
      .on('end', () => {
        console.log('Snapshot captured:', outputPath);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Error capturing snapshot:', err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Capture video clip from RTSP stream using ffmpeg
 * @param {string} rtspUrl - RTSP stream URL
 * @param {string} outputPath - Output file path
 * @param {object} options - Clip options (duration, format, quality)
 * @returns {Promise<string>} - Path to saved clip
 */
async function captureClip(rtspUrl, outputPath, options = {}) {
  const {
    duration = 10, // seconds
    format = 'mp4',
    quality = 'high', // high, medium, low
  } = options;

  // Quality presets
  const qualityPresets = {
    high: { crf: 18, preset: 'medium' },
    medium: { crf: 23, preset: 'fast' },
    low: { crf: 28, preset: 'veryfast' },
  };

  const preset = qualityPresets[quality] || qualityPresets.medium;

  return new Promise((resolve, reject) => {
    ffmpeg(rtspUrl)
      .inputOptions([
        '-rtsp_transport', 'tcp',
        '-analyzeduration', '5000000',
        '-probesize', '5000000',
      ])
      .outputOptions([
        '-t', duration.toString(),
        '-c:v', 'libx264',
        '-crf', preset.crf.toString(),
        '-preset', preset.preset,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
      ])
      .output(outputPath)
      .on('end', () => {
        console.log('Clip captured:', outputPath);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Error capturing clip:', err.message);
        reject(err);
      })
      .on('progress', (progress) => {
        console.log(`Processing: ${progress.percent}% done`);
      })
      .run();
  });
}

/**
 * Extract frame from RTSP stream for AI processing
 * @param {string} rtspUrl - RTSP stream URL
 * @param {string} outputPath - Output file path
 * @returns {Promise<string>} - Path to extracted frame
 */
async function extractFrameForAI(rtspUrl, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(rtspUrl)
      .inputOptions([
        '-rtsp_transport', 'tcp',
        '-analyzeduration', '1000000',
        '-probesize', '1000000',
      ])
      .outputOptions([
        '-vframes', '1',
        '-q:v', '2',
      ])
      .output(outputPath)
      .on('end', () => {
        resolve(outputPath);
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

/**
 * Check if RTSP stream is accessible
 * @param {string} rtspUrl - RTSP stream URL
 * @returns {Promise<boolean>} - True if stream is accessible
 */
async function checkStreamHealth(rtspUrl) {
  return new Promise((resolve) => {
    ffmpeg(rtspUrl)
      .inputOptions([
        '-rtsp_transport', 'tcp',
        '-analyzeduration', '2000000',
        '-probesize', '2000000',
      ])
      .outputOptions([
        '-t', '1',
        '-f', 'null',
      ])
      .output('-')
      .on('end', () => {
        resolve(true);
      })
      .on('error', () => {
        resolve(false);
      })
      .run();
  });
}

module.exports = {
  captureSnapshot,
  captureClip,
  extractFrameForAI,
  checkStreamHealth,
};
