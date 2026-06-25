from PIL import Image
img = Image.open(r"c:\Users\admin\Desktop\devitimes\public\logo.png")
print("Image size:", img.size)
cx = img.size[0] // 2
for y in range(50):
    print(f"y={y}: {img.getpixel((cx, y))}")
