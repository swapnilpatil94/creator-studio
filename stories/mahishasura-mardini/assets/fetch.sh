#!/bin/sh
# Re-downloads the original paintings (public domain / CC0, see CREDITS.md) into original/, then run: python3 prep.py
mkdir -p original && cd original; UA="creator-studio-research/1.0 (local)"
dl(){ curl -sL -A "$UA" -o "$1" "$2"; sleep 2; }
dl 01-ravivarma-press-durga.jpg "https://upload.wikimedia.org/wikipedia/commons/7/74/Durga_Mahishasura-mardini%2C_the_slayer_of_the_buffalo_demon.jpg"
dl 02-dia-durga-combat-bull.jpg "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/Unknown_%28Indian%29_-_Durga_in_Combat_with_the_Bull%2C_Mahishasura_-_69.428_-_Detroit_Institute_of_Arts.jpg/1920px-Unknown_%28Indian%29_-_Durga_in_Combat_with_the_Bull%2C_Mahishasura_-_69.428_-_Detroit_Institute_of_Arts.jpg"
dl 03-dia-durga-decapitated-bull.jpg "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e6/Unknown_%28Indian%29_-_Durga%2C_Having_Decapitated_Bull_and_Mahishasura_Within%2C_Drives_off_Remaining_Demons_while_Gods_in_Clouds_Applaud_-_69.429_-_Detroit_Institute_of_Arts.jpg/1920px-thumbnail.jpg"
dl 04-basholi-bhadrakali-gods.jpg "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Goddess_Bhadrakali_Worshipped_by_the_Gods-_from_a_tantric_Devi_series_-_Google_Art_Project.jpg/1920px-Goddess_Bhadrakali_Worshipped_by_the_Gods-_from_a_tantric_Devi_series_-_Google_Art_Project.jpg"
dl 05-met-durga-buffalo.jpg "https://upload.wikimedia.org/wikipedia/commons/e/e5/MET_DP166075.jpg"
dl 06-guler-durga.jpg "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/Durga_Mahisasuramardini.JPG/1920px-Durga_Mahisasuramardini.JPG"
