import os, shutil
from PIL import Image

APP = "/home/hosein/Documents/p/rithmo/rithmo-native/rithmo-app"
SRC = os.path.join(APP, ".icon-proposal/concept-c.png")
BACKUP = os.path.join(APP, ".icon-proposal/backup")
os.makedirs(BACKUP, exist_ok=True)

# 1) Back up originals
backed = []
for root, dirs, files in os.walk(os.path.join(APP, "android/app/src/main/res")):
    for f in files:
        if f.startswith("ic_launcher"):
            src = os.path.join(root, f)
            rel = os.path.relpath(src, os.path.join(APP, "android/app/src/main/res"))
            dst = os.path.join(BACKUP, "android", rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
            backed.append("android/" + rel)
ios_dir = os.path.join(APP, "ios/rithmo_scaffold/Images.xcassets/AppIcon.appiconset")
os.makedirs(os.path.join(BACKUP, "ios"), exist_ok=True)
for f in os.listdir(ios_dir):
    if f.endswith(".png"):
        shutil.copy2(os.path.join(ios_dir, f), os.path.join(BACKUP, "ios", f))
        backed.append("ios/" + f)

# 2) Generate all sizes from the 1024 master
img = Image.open(SRC).convert("RGBA")
assert img.size == (1024, 1024), img.size

def put(path, size):
    out = img.resize((size, size), Image.Resampling.LANCZOS)
    out.save(path)
    return out.size

written = []
for dpi, px in [("mdpi",48),("hdpi",72),("xhdpi",96),("xxhdpi",144),("xxxhdpi",192)]:
    for name in ("ic_launcher.png","ic_launcher_round.png"):
        p = os.path.join(APP, f"android/app/src/main/res/mipmap-{dpi}/{name}")
        written.append((p, put(p, px)))

ios_sizes = {"icon-20@2x.png":40,"icon-20@3x.png":60,"icon-29@2x.png":58,"icon-29@3x.png":87,
             "icon-40@2x.png":80,"icon-40@3x.png":120,"icon-60@2x.png":120,"icon-60@3x.png":180,
             "icon-1024.png":1024}
for f, s in ios_sizes.items():
    p = os.path.join(ios_dir, f)
    written.append((p, put(p, s)))

print("BACKED UP:", len(backed))
for b in backed:
    print("  " + b)
print("WRITTEN:", len(written))
for p, s in written:
    print(f"  {os.path.relpath(p, APP)}  {s[0]}x{s[1]}")
