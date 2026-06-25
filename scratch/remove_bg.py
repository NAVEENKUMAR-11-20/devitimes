import os
import math
from PIL import Image

def remove_background(image_path, output_path):
    img = Image.open(image_path).convert("RGBA")
    width, height = img.size
    cx, cy = width / 2.0, height / 2.0

    # Scan from top center downwards to find the outer blue circle border
    # We look for the first pixel that is not white (e.g., sum of RGB < 720)
    y_border = 0
    for y in range(int(cy)):
        r, g, b, a = img.getpixel((int(cx), y))
        if r < 240 or g < 240 or b < 240:
            y_border = y
            break

    # Calculate radius from y_border
    # Leave 1-2 pixels margin to avoid cutting the border
    radius = cy - y_border
    print(f"Detected circle border y: {y_border}, radius: {radius}")

    # Process all pixels
    pixels = img.load()
    for y in range(height):
        for x in range(width):
            dx = x - cx
            dy = y - cy
            dist = math.sqrt(dx*dx + dy*dy)
            
            # If outside the detected circle, make transparent if it is white/light
            # We also do a bit of smooth anti-aliasing at the boundary
            if dist >= radius - 1:
                # Get current color
                r, g, b, a = pixels[x, y]
                # If it's a light background pixel, make it transparent
                if r > 200 and g > 200 and b > 200:
                    # Fade out alpha near the edge for anti-aliasing
                    if dist < radius + 1:
                        # Interpolate alpha
                        factor = (radius + 1 - dist) / 2.0
                        pixels[x, y] = (r, g, b, int(a * factor))
                    else:
                        pixels[x, y] = (r, g, b, 0)

    # Save as PNG
    img.save(output_path, "PNG")
    print(f"Saved transparent logo to {output_path}")

if __name__ == "__main__":
    logo_path = r"c:\Users\admin\Desktop\devitimes\public\logo.png"
    remove_background(logo_path, logo_path)
