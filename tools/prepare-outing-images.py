"""Create lightweight derivatives; retain original GPT images unchanged."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent / 'generated-images'
original_bytes = full_bytes = thumbnail_bytes = 0
for source in sorted(root.glob('outing-*-v1.png')):
    original_bytes += source.stat().st_size
    with Image.open(source) as image:
        for suffix, width, quality in [('v2', 1280, 86), ('thumb-v2', 480, 78)]:
            size = (width, round(image.height * width / image.width))
            target = source.with_name(source.name.replace('v1.png', suffix + '.webp'))
            image.convert('RGB').resize(size, Image.Resampling.LANCZOS).save(target, 'WEBP', quality=quality, method=6)
            if suffix == 'v2':
                full_bytes += target.stat().st_size
            else:
                thumbnail_bytes += target.stat().st_size
print(f'Originals: {original_bytes:,} B; detail images: {full_bytes:,} B; all thumbnails: {thumbnail_bytes:,} B')
