import math
from PIL import Image

def process_logo():
    # Load original image
    src_path = r"C:\Users\admin\.gemini\antigravity\brain\e8bbcac1-fa02-48ba-9716-7eaf726b867d\media__1781510067593.jpg"
    dest_path = r"c:\Users\admin\Desktop\devitimes\public\logo.png"
    
    img = Image.open(src_path).convert("RGBA")
    width, height = img.size
    cx, cy = width / 2.0, height / 2.0
    
    # Outer circle border radius is ~316.5px (diameter 633px in a 640px image)
    inner_r = 315.5
    outer_r = 317.5
    
    pixels = img.load()
    for y in range(height):
        for x in range(width):
            dx = x - cx
            dy = y - cy
            dist = math.sqrt(dx*dx + dy*dy)
            
            if dist > inner_r:
                r, g, b, a = pixels[x, y]
                if dist > outer_r:
                    # Fully transparent outside
                    pixels[x, y] = (r, g, b, 0)
                else:
                    # Smooth transition for anti-aliasing
                    alpha = int(255 * (outer_r - dist) / (outer_r - inner_r))
                    pixels[x, y] = (r, g, b, max(0, min(255, alpha)))
                    
    img.save(dest_path, "PNG")
    print(f"Successfully processed logo and saved to {dest_path}")

if __name__ == "__main__":
    process_logo()
