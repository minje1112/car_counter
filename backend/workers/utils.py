import numpy as np
import cv2
from shapely.geometry import Polygon, Point
from datetime import datetime
from PIL import ImageColor

# Constants for drawing
LINE_THICKNESS = 1
TRACK_THICKNESS = 1
REGION_THICKNESS = 2

class Region:
    """
    Represents a polygonal region on the frame and tracks objects entering the region.
    
    Attributes:
        name (str): Name of the region (based on polygon label).
        polygon (ndarray): Scaled polygon points defining the region.
        counts (int): Count of objects that have entered the region.
        track_ids (dict): Dictionary of track IDs that have entered the region.
        ids (set): Set of unique track IDs inside the region.
        color (tuple): Color of the region (RGB).
        text_color (tuple): Color of the text drawn on the region.
        arrow (ndarray): Arrow points for directional check.
        vec (ndarray): Direction vector of the region's arrow.
    """
    def __init__(self, arrow, polygon, frame_width, frame_height):
        self.name = polygon['text']
        
        # Scale polygon points to frame dimensions
        self.polygon = np.array(polygon['points'])
        self.polygon[:, 0] *= frame_width
        self.polygon[:, 1] *= frame_height
        self.polygon = self.polygon.astype(np.int32)

        # Initialize region attributes
        self.counts = 0
        self.track_ids = {}
        self.ids = set()
        self.color = ImageColor.getcolor(polygon['color'], "RGB")
        self.text_color = (255, 255, 255)  # White text color
        
        # Scale arrow points to frame dimensions and create a direction vector
        self.arrow = np.array(arrow['points'])
        self.arrow[:, 0] *= frame_width
        self.arrow[:, 1] *= frame_height
        self.vec = self.arrow[1] - self.arrow[0]  # Direction vector for angle calculation

def calculate_angle(vector1, vector2):
    """
    Calculate the angle in degrees between two vectors.
    
    Parameters:
        vector1 (ndarray): First vector.
        vector2 (ndarray): Second vector.
        
    Returns:
        float: Angle in degrees between vector1 and vector2.
    """
    dot_product = np.dot(vector1, vector2)
    magnitude1 = np.linalg.norm(vector1)
    magnitude2 = np.linalg.norm(vector2)
    
    # Calculate the angle in radians and convert to degrees
    cosine_angle = dot_product / (magnitude1 * magnitude2)
    angle_radians = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return np.degrees(angle_radians)

def draw_regions(regions, frame):
    """
    Draw polygonal regions and the number of objects inside them on the frame.
    
    Parameters:
        regions (list): List of Region objects.
        frame (ndarray): The current video frame.
    """
    for region in regions:
        # Display the count of unique objects in the region
        region_label = str(len(region.ids))
        centroid_x, centroid_y = int(Polygon(region.polygon).centroid.x), int(Polygon(region.polygon).centroid.y)

        # Get text size for drawing
        text_size, _ = cv2.getTextSize(region_label, cv2.FONT_HERSHEY_SIMPLEX, fontScale=2.5, thickness=LINE_THICKNESS)
        text_x = centroid_x - text_size[0] // 2
        text_y = centroid_y + text_size[1] // 2
        
        # Draw a filled rectangle behind the text for better visibility
        cv2.rectangle(
            frame, 
            (text_x - 5, text_y - text_size[1] - 5),
            (text_x + text_size[0] + 5, text_y + 5),
            region.color,
            -1
        )
        
        # Draw the count of objects as text on the region
        cv2.putText(frame, region_label, (text_x, text_y), cv2.FONT_HERSHEY_SIMPLEX, 2.5, region.text_color, LINE_THICKNESS)
        
        # Draw the polygon outline of the region
        cv2.polylines(frame, [region.polygon], isClosed=True, color=region.color, thickness=REGION_THICKNESS)

def draw_regions_name(regions, frame):
    """
    Draw polygonal regions and the number of objects inside them on the frame.
    
    Parameters:
        regions (list): List of Region objects.
        frame (ndarray): The current video frame.
    """
    for region in regions:
        # Display the count of unique objects in the region
        region_label = str(len(region.ids))
        centroid_x, centroid_y = int(Polygon(region.polygon).centroid.x), int(Polygon(region.polygon).centroid.y)

        # Get text size for drawing
        text_size, _ = cv2.getTextSize(region_label, cv2.FONT_HERSHEY_SIMPLEX, fontScale=2.5, thickness=LINE_THICKNESS)
        text_x = centroid_x - text_size[0] // 2
        text_y = centroid_y + text_size[1] // 2
        
        # Draw a filled rectangle behind the text for better visibility
        cv2.rectangle(
            frame, 
            (text_x - 5, text_y - text_size[1] - 5),
            (text_x + text_size[0] + 5, text_y + 5),
            region.color,
            -1
        )
        cv2.rectangle(
            frame, 
            (text_x - 5, text_y - text_size[1] - 5),
            (text_x + text_size[0] + 5, text_y + 5),
            region.color,
            -1
        )
        
        # Draw the count of objects as text on the region
        cv2.putText(frame, region_label, (text_x, text_y), cv2.FONT_HERSHEY_SIMPLEX, 2.5, region.text_color, LINE_THICKNESS)
        cv2.putText(frame, region.name, (text_x, text_y - 100), cv2.FONT_HERSHEY_SIMPLEX, 2.5, (0, 0, 255), LINE_THICKNESS)
        # Draw the polygon outline of the region
        cv2.polylines(frame, [region.polygon], isClosed=True, color=region.color, thickness=REGION_THICKNESS)


def create_regions(width, height, polygons, arrows):
    """
    Create a list of Region objects based on polygons and arrows.
    
    Parameters:
        width (int): Width of the video frame.
        height (int): Height of the video frame.
        polygons (list): List of polygon configurations.
        arrows (list): List of arrow configurations.
        
    Returns:
        list: List of Region objects.
    """
    regions = []
    for polygon in polygons:
        # Match the arrow with the polygon by label
        arrow = find_by_label(arrows, polygon['text'])
        if arrow is None:
            continue
        region = Region(arrow, polygon, width, height)
        regions.append(region)
    return regions

def find_by_label(data_list, target_label):
    """
    Find an element in a list by its label.
    
    Parameters:
        data_list (list): List of data elements, each containing a 'label' key.
        target_label (str): The label to search for.
        
    Returns:
        dict or None: The element with the matching label, or None if not found.
    """
    for element in data_list:
        if element['label'] == target_label:
            return element
    return None 

def is_inside_region(region, bbox_center, reg_history, track_id, angle=45):
    """
    Check if the center of a bounding box is inside a region's polygon and track its movement.
    
    Parameters:
        region (Region): The region to check.
        bbox_center (tuple): Center coordinates of the bounding box.
        reg_history (dict): History of object positions inside regions.
        track_id (int): ID of the tracked object.
        
    Returns:
        bool: True if the object is inside the region, False otherwise.
    """
    if Polygon(region.polygon).contains(Point(bbox_center)):
        reg_history[track_id].append(bbox_center)
        
        # Ensure enough history points exist to calculate movement direction
        if len(reg_history[track_id]) > 5:
            # Calculate the movement direction vector from recent positions
            vec_dir = np.array(reg_history[track_id][-1]) - np.array(reg_history[track_id][-3])
            
            # Check if the movement direction aligns with the region's direction (within 45 degrees)
            if calculate_angle(region.vec, vec_dir) < angle:
                region.ids.add(track_id)
                
                # If it's a new track ID for this region, mark it
                if track_id not in region.track_ids:
                    region.track_ids[track_id] = track_id
                    return True
    return False
