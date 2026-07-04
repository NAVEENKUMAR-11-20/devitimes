from PIL import Image
img = Image.open(r"C:\Users\admin\.gemini\antigravity\brain\e8bbcac1-fa02-48ba-9716-7eaf726b867d\media__1781510067593.jpg")
for t in range(150):
    print(f"t={t} ({t},{t}): {img.getpixel((t, t))}")
