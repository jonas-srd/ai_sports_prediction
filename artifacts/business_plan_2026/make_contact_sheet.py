from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).parent / "qa_xlsx"
paths = sorted(p for p in root.glob("*.png") if p.name != "contact_sheet.png")
thumbs = []
for path in paths:
    image = Image.open(path).convert("RGB")
    image.thumbnail((420, 280))
    canvas = Image.new("RGB", (440, 320), "white")
    canvas.paste(image, ((440 - image.width) // 2, 25))
    ImageDraw.Draw(canvas).text((10, 5), path.stem, fill="black")
    thumbs.append(canvas)

out = Image.new("RGB", (900, ((len(thumbs) + 1) // 2) * 320), "#D8DEE4")
for index, image in enumerate(thumbs):
    out.paste(image, ((index % 2) * 450, (index // 2) * 320))
out.save(root / "contact_sheet.png")
