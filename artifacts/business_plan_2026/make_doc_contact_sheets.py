from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).parent / "rendered_docx_v2"
pages = sorted(root.glob("page-*.png"), key=lambda p: int(p.stem.split("-")[1]))
out_dir = root / "contacts"
out_dir.mkdir(exist_ok=True)
for start in range(0, len(pages), 4):
    batch = pages[start:start+4]
    sheet = Image.new("RGB", (1680, 2140), "#C7D0D7")
    draw = ImageDraw.Draw(sheet)
    for idx, path in enumerate(batch):
        image = Image.open(path).convert("RGB")
        image.thumbnail((800, 1010))
        x = 20 + (idx % 2) * 830
        y = 55 + (idx // 2) * 1040
        sheet.paste(image, (x, y))
        draw.text((x, 18 + (idx // 2) * 1040), path.stem, fill="black")
    sheet.save(out_dir / f"pages_{start+1:02d}_{start+len(batch):02d}.jpg", quality=90)
