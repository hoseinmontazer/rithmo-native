import urllib.request
import urllib.parse
from PIL import Image
import io
import collections
import ssl

url = "https://www.figma.com/file/aqzV8vKKwO8q0P3wKKSQYA/thumbnail?node-id=2-4&in-better-link-exp=true"
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        img_data = response.read()
    img = Image.open(io.BytesIO(img_data)).convert('RGB')
    img.thumbnail((150, 150))
    pixels = list(img.getdata())
    counter = collections.Counter(pixels)
    most_common = counter.most_common(10)
    for color, count in most_common:
        print(f"Hex: #{color[0]:02x}{color[1]:02x}{color[2]:02x} Count: {count}")
except Exception as e:
    print(e)
