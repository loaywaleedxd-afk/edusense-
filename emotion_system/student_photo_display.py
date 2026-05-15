"""
═════════════════════════════════════════════════════════════════
Student Photo Display Module
═════════════════════════════════════════════════════════════════
Display student photos during attendance marking with face recognition
"""

import json
import os
import cv2
import numpy as np
from typing import Dict, List, Optional, Tuple
from PIL import Image, ImageDraw, ImageFont
import io


class StudentPhotoDisplay:
    """Display student photos during attendance and face recognition"""
    
    def __init__(self, store_path: str = "gui/store.json",
                 photos_dir: str = "student_photos"):
        """
        Initialize photo display system
        
        Args:
            store_path: Path to store.json
            photos_dir: Directory containing student photos
        """
        self.store_path = store_path
        self.photos_dir = photos_dir
        self.students = {}
        self.photo_cache = {}  # Cache to avoid reloading
        
        self._load_students()
    
    def _load_students(self):
        """Load all students from store.json"""
        try:
            with open(self.store_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            for student in data.get('students', []):
                student_id = student.get('id')
                self.students[student_id] = {
                    'id': student_id,
                    'name': student.get('name', 'Unknown'),
                    'dept': student.get('dept', ''),
                    'year': student.get('year', 1),
                    'email': student.get('email', ''),
                    'has_face': student.get('has_face', False)
                }
            
            print(f"✅ Loaded {len(self.students)} students")
            
        except Exception as e:
            print(f"❌ Error loading students: {e}")
    
    def get_photo_path(self, student_id: str) -> Optional[str]:
        """
        Get the file path for a student's photo
        
        Tries: jpg, png, jpeg formats
        """
        for ext in ['jpg', 'png', 'jpeg']:
            path = os.path.join(self.photos_dir, f"{student_id}.{ext}")
            if os.path.exists(path):
                return path
        return None
    
    def load_photo_cv2(self, student_id: str) -> Optional[np.ndarray]:
        """
        Load student photo as OpenCV image (BGR format)
        
        Returns:
            OpenCV image or None if not found
        """
        # Check cache
        if student_id in self.photo_cache:
            return self.photo_cache[student_id]
        
        photo_path = self.get_photo_path(student_id)
        if not photo_path:
            return None
        
        try:
            img = cv2.imread(photo_path)
            if img is not None:
                self.photo_cache[student_id] = img
                return img
        except Exception as e:
            print(f"❌ Error loading photo for {student_id}: {e}")
        
        return None
    
    def load_photo_pil(self, student_id: str) -> Optional[Image.Image]:
        """
        Load student photo as PIL Image
        
        Returns:
            PIL Image or None if not found
        """
        photo_path = self.get_photo_path(student_id)
        if not photo_path:
            return None
        
        try:
            img = Image.open(photo_path)
            return img
        except Exception as e:
            print(f"❌ Error loading photo for {student_id}: {e}")
        
        return None
    
    def get_student_info(self, student_id: str) -> Optional[Dict]:
        """Get student information"""
        return self.students.get(student_id)
    
    def display_photo_cv2(self, student_id: str, window_name: str = "Student") -> bool:
        """
        Display student photo in OpenCV window with student info
        
        Args:
            student_id: Student ID
            window_name: OpenCV window name
            
        Returns:
            True if displayed successfully
        """
        photo = self.load_photo_cv2(student_id)
        student = self.get_student_info(student_id)
        
        if photo is None:
            print(f"⚠️  No photo found for {student_id}")
            return False
        
        if student is None:
            print(f"⚠️  Student {student_id} not found")
            return False
        
        # Create a copy to draw on
        display = photo.copy()
        h, w = display.shape[:2]
        
        # Add student info at top
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.8
        color = (0, 255, 0)  # Green
        thickness = 2
        
        y_offset = 40
        cv2.putText(display, f"Name: {student['name']}", 
                   (20, y_offset), font, font_scale, color, thickness)
        cv2.putText(display, f"ID: {student['id']}", 
                   (20, y_offset + 40), font, font_scale, color, thickness)
        cv2.putText(display, f"Dept: {student['dept']}", 
                   (20, y_offset + 80), font, font_scale, color, thickness)
        cv2.putText(display, f"Year: {student['year']}", 
                   (20, y_offset + 120), font, font_scale, color, thickness)
        
        # Display
        cv2.imshow(window_name, display)
        
        return True
    
    def get_student_card_image(self, student_id: str, 
                              width: int = 300, 
                              height: int = 400) -> Optional[Image.Image]:
        """
        Create a student card image with photo and info
        
        Args:
            student_id: Student ID
            width: Card width in pixels
            height: Card height in pixels
            
        Returns:
            PIL Image of the card
        """
        student = self.get_student_info(student_id)
        if not student:
            return None
        
        try:
            # Load student photo
            photo_pil = self.load_photo_pil(student_id)
            
            # Create card background
            card = Image.new('RGB', (width, height), color=(240, 240, 240))
            
            # Add photo if available
            if photo_pil:
                # Resize photo to fit card
                photo_width = width - 20
                photo_height = int(height * 0.6)
                photo_pil = photo_pil.resize((photo_width, photo_height), 
                                            Image.Resampling.LANCZOS)
                card.paste(photo_pil, (10, 10))
                info_y = photo_height + 20
            else:
                # No photo - create placeholder
                draw = ImageDraw.Draw(card)
                draw.rectangle([(10, 10), (width-10, height*0.6)], 
                             outline=(200, 200, 200), width=2)
                draw.text((width//2, height*0.3), "No Photo", 
                         fill=(150, 150, 150))
                info_y = int(height * 0.6) + 20
            
            # Add student info
            draw = ImageDraw.Draw(card)
            try:
                # Try to use a nice font (fallback to default)
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
                small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
            except:
                font = ImageFont.load_default()
                small_font = font
            
            # Text info
            info_text = [
                f"Name: {student['name']}",
                f"ID: {student['id']}",
                f"Dept: {student['dept']}",
                f"Year: {student['year']}"
            ]
            
            for i, line in enumerate(info_text):
                draw.text((15, info_y + i*25), line, 
                         fill=(0, 0, 0), font=small_font)
            
            return card
            
        except Exception as e:
            print(f"❌ Error creating card: {e}")
            return None
    
    def show_student_card(self, student_id: str, wait_ms: int = 0) -> bool:
        """
        Display student card image (requires matplotlib or PIL)
        
        Args:
            student_id: Student ID
            wait_ms: Milliseconds to display (0 = wait for key)
            
        Returns:
            True if displayed
        """
        try:
            import matplotlib.pyplot as plt
            
            card = self.get_student_card_image(student_id)
            if card is None:
                return False
            
            plt.figure(figsize=(6, 8))
            plt.imshow(card)
            plt.axis('off')
            plt.tight_layout()
            
            if wait_ms == 0:
                plt.show()
            else:
                plt.show(block=False)
                plt.pause(wait_ms / 1000.0)
                plt.close()
            
            return True
            
        except ImportError:
            print("⚠️  matplotlib not installed. Use display_photo_cv2() instead")
            return self.display_photo_cv2(student_id)
    
    def create_attendance_display(self, student_ids: List[str],
                                 cols: int = 2) -> Optional[Image.Image]:
        """
        Create a grid of student cards for display
        
        Args:
            student_ids: List of student IDs
            cols: Number of columns in grid
            
        Returns:
            PIL Image of the grid
        """
        if not student_ids:
            return None
        
        try:
            cards = []
            for sid in student_ids:
                card = self.get_student_card_image(sid, 300, 350)
                if card:
                    cards.append(card)
            
            if not cards:
                return None
            
            # Calculate grid size
            rows = (len(cards) + cols - 1) // cols
            grid_width = 300 * cols + 20 * (cols + 1)
            grid_height = 350 * rows + 20 * (rows + 1)
            
            # Create grid image
            grid = Image.new('RGB', (grid_width, grid_height), (255, 255, 255))
            
            # Paste cards
            for i, card in enumerate(cards):
                row = i // cols
                col = i % cols
                x = col * 300 + 20 * (col + 1)
                y = row * 350 + 20 * (row + 1)
                grid.paste(card, (x, y))
            
            return grid
            
        except Exception as e:
            print(f"❌ Error creating grid: {e}")
            return None
    
    def clear_cache(self):
        """Clear photo cache to free memory"""
        self.photo_cache.clear()
        print("✅ Photo cache cleared")


# ═════════════════════════════════════════════════════════════════
# Example Usage
# ═════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    
    # Initialize
    display = StudentPhotoDisplay(
        store_path="gui/store.json",
        photos_dir="student_photos"
    )
    
    # Example 1: Display a single student photo
    print("\n" + "="*60)
    print("DISPLAYING STUDENT PHOTO")
    print("="*60)
    
    student_id = "s001"  # Change to actual student ID
    student = display.get_student_info(student_id)
    
    if student:
        print(f"👤 {student['name']} ({student['id']})")
        print(f"   Department: {student['dept']}")
        print(f"   Year: {student['year']}")
        
        # Display photo
        if display.display_photo_cv2(student_id, f"Student {student_id}"):
            print("✅ Photo displayed (press any key to close)")
            cv2.waitKey(0)
            cv2.destroyAllWindows()
        else:
            print("⚠️  Photo not available")
    
    # Example 2: Create student card
    print("\n" + "="*60)
    print("CREATING STUDENT CARD")
    print("="*60)
    
    card = display.get_student_card_image(student_id, 300, 400)
    if card:
        card.save(f"/tmp/{student_id}_card.png")
        print(f"✅ Card saved to /tmp/{student_id}_card.png")
        # card.show()  # Uncomment to display
    
    # Example 3: Create attendance grid
    print("\n" + "="*60)
    print("CREATING ATTENDANCE GRID")
    print("="*60)
    
    student_list = list(display.students.keys())[:6]  # First 6 students
    grid = display.create_attendance_display(student_list, cols=2)
    if grid:
        grid.save("/tmp/attendance_grid.png")
        print(f"✅ Grid saved to /tmp/attendance_grid.png")
        # grid.show()  # Uncomment to display
