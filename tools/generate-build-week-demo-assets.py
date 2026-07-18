#!/usr/bin/env python3
"""Generate privacy-safe synthetic garment photos for the Build Week demo.

The images contain no people, metadata, logos, or external source material. They
are written to a caller-provided directory and are intentionally not committed.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


WIDTH = 900
HEIGHT = 1100
BACKGROUND = "#f3efe8"
OUTLINE = "#2e2a27"


def canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((55, 45, WIDTH - 55, HEIGHT - 45), radius=44, fill="#fbfaf7")
    return image, draw


def save(image: Image.Image, output: Path, name: str) -> None:
    image.save(output / name, format="PNG", optimize=True)


def suit(output: Path) -> None:
    image, draw = canvas()
    navy = "#182b4d"
    draw.polygon([(270, 205), (390, 145), (450, 270), (510, 145), (630, 205), (720, 910), (180, 910)], fill=navy, outline=OUTLINE, width=8)
    draw.polygon([(390, 145), (450, 270), (370, 455), (290, 225)], fill="#223b67", outline=OUTLINE, width=5)
    draw.polygon([(510, 145), (450, 270), (530, 455), (610, 225)], fill="#223b67", outline=OUTLINE, width=5)
    draw.polygon([(420, 270), (480, 270), (500, 865), (400, 865)], fill="#f7f4ee")
    for y in (520, 650, 780):
        draw.ellipse((438, y, 462, y + 24), fill="#d9bf72")
    draw.line((450, 455, 450, 905), fill="#0f1b31", width=7)
    save(image, output, "navy-suit.png")


def shirt(output: Path) -> None:
    image, draw = canvas()
    white = "#f7f7f3"
    draw.polygon([(275, 215), (390, 155), (450, 235), (510, 155), (625, 215), (700, 900), (200, 900)], fill=white, outline=OUTLINE, width=8)
    draw.polygon([(390, 155), (450, 235), (370, 315)], fill="#e8edf1", outline=OUTLINE, width=5)
    draw.polygon([(510, 155), (450, 235), (530, 315)], fill="#e8edf1", outline=OUTLINE, width=5)
    draw.line((450, 235, 450, 875), fill="#bac3ca", width=5)
    for y in range(330, 820, 95):
        draw.ellipse((439, y, 461, y + 22), fill="#a9b3bc")
    save(image, output, "white-shirt.png")


def tie(output: Path) -> None:
    image, draw = canvas()
    burgundy = "#7d2034"
    draw.polygon([(385, 185), (515, 185), (550, 300), (450, 415), (350, 300)], fill=burgundy, outline=OUTLINE, width=8)
    draw.polygon([(405, 385), (495, 385), (555, 820), (450, 935), (345, 820)], fill="#8f2941", outline=OUTLINE, width=8)
    draw.line((375, 590, 520, 700), fill="#c78d98", width=18)
    save(image, output, "burgundy-tie.png")


def blouse(output: Path) -> None:
    image, draw = canvas()
    ivory = "#f6f0df"
    draw.polygon([(265, 245), (375, 170), (450, 240), (525, 170), (635, 245), (720, 860), (180, 860)], fill=ivory, outline=OUTLINE, width=8)
    draw.arc((350, 135, 550, 315), start=15, end=165, fill="#bcae8d", width=8)
    draw.line((450, 260, 450, 835), fill="#d5c8aa", width=5)
    for y in range(350, 760, 90):
        draw.ellipse((439, y, 461, y + 22), fill="#b7a983")
    draw.arc((585, 520, 675, 760), start=90, end=270, fill="#d5c8aa", width=7)
    draw.arc((225, 520, 315, 760), start=270, end=90, fill="#d5c8aa", width=7)
    save(image, output, "ivory-blouse.png")


def skirt(output: Path) -> None:
    image, draw = canvas()
    navy = "#253b63"
    draw.rounded_rectangle((305, 170, 595, 265), radius=28, fill="#172943", outline=OUTLINE, width=7)
    draw.polygon([(305, 245), (595, 245), (730, 920), (170, 920)], fill=navy, outline=OUTLINE, width=8)
    for x in (315, 385, 455, 525, 595):
        draw.line((x, 280, 450 + (x - 450) * 1.72, 885), fill="#405784", width=7)
    save(image, output, "navy-skirt.png")


def brooch(output: Path) -> None:
    image, draw = canvas()
    gold = "#c69a32"
    draw.ellipse((270, 245, 630, 605), fill="#f5e2a9", outline=gold, width=22)
    for angle_points in (
        [(450, 280), (500, 425), (450, 570), (400, 425)],
        [(305, 425), (450, 375), (595, 425), (450, 475)],
    ):
        draw.polygon(angle_points, fill="#d9b74f", outline="#8e6b1c")
    draw.ellipse((395, 370, 505, 480), fill="#fff2b8", outline="#8e6b1c", width=7)
    draw.arc((330, 560, 570, 890), start=195, end=345, fill="#8e6b1c", width=18)
    save(image, output, "gold-brooch.png")


def dress(output: Path) -> None:
    image, draw = canvas()
    blue = "#2868a0"
    draw.polygon([(385, 150), (515, 150), (560, 360), (680, 930), (220, 930), (340, 360)], fill=blue, outline=OUTLINE, width=8)
    draw.arc((355, 110, 545, 265), start=20, end=160, fill="#dcecf7", width=12)
    draw.line((335, 360, 565, 360), fill="#17476e", width=18)
    draw.polygon([(335, 370), (565, 370), (730, 930), (170, 930)], fill="#347fb8", outline=OUTLINE, width=8)
    for x in (300, 380, 460, 540, 620):
        draw.line((x, 410, 450 + (x - 450) * 1.45, 890), fill="#5b9dca", width=5)
    save(image, output, "blue-a-line-dress.png")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    for render in (suit, shirt, tie, blouse, skirt, brooch, dress):
        render(args.output)
    print(args.output.resolve())


if __name__ == "__main__":
    main()
