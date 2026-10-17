#!/usr/bin/env python3
"""Bakes the Durga long film's public-domain art (credits in CREDITS.md and ../../mahishasura-mardini/assets/CREDITS.md) into dot-ready images. Crops remove museum mats and borders."""
import os, sys
D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, D + "/../../../tools"); from bake import bake_all
O = D + "/original/"; M = D + "/../../mahishasura-mardini/assets/color/"
CROPS = {"A001": (230, 230, 1790, 1260), "A002": (110, 150, 1430, 2000), "A004": (30, 20, 870, 1240), "A005": None, "A007": (60, 60, 1740, 2270), "A015": (130, 110, 1870, 1640), "A016": (490, 310, 1490, 1040),
         "A017": (20, 40, 1900, 1150), "B007": None, "B008": (110, 40, 1850, 1300), "B033": None, "B045": (60, 60, 1860, 1070), "B052": (35, 50, 865, 540), "B054": None, "B057": (50, 50, 820, 860), "B060": (30, 30, 870, 550)}
JOBS = {k: dict(src=O + k + ".jpg", crop=c, mix=0.85, edge=1.0) for k, c in CROPS.items()}
JOBS.update({"m" + n: dict(src=M + n + ".jpg", crop=None, mix=0.85, edge=1.0) for n in ["01", "02", "03", "04", "06"]})   # owned Short paintings, already cropped
bake_all(JOBS, D)
