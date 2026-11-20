#!/usr/bin/env python3
"""Render one poster per breed group (English and German), drawn to scale with the site's illustrations.

Groups follow the familiar FCI-style families. Breeds are sorted by height and split into rows of
about ROW_MAX dogs; every dog is drawn at the midpoint of the male and female breed-standard height,
at one shared scale per poster. Rendering is shared with tools/build_podenco_poster.py.

Output per poster and language: poster/<file>.png, poster/<file>-preview.jpg and web copies in img/posters/.

  .venv/bin/python tools/build_group_posters.py [--only sighthounds,terriers] [--lang en|de] [--width 4800]
"""
import argparse, json, math, os, sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_podenco_poster import load, render  # noqa: E402
from build_poster import DISPLAY, ROOT  # noqa: E402

ROW_MAX = 10

# key: (English title, German title, English file, German file, English sub, German sub, breeds)
GROUPS = {
    "sighthounds": (
        "Sighthounds, drawn to scale", "Windhunde, maßstabsgetreu", "sighthounds-to-scale", "windhunde-massstabsgetreu",
        "From the Italian Greyhound to the Irish Wolfhound.", "Vom Italienischen Windspiel bis zum Irischen Wolfshund.",
        ["Italian Greyhound", "Whippet", "Greyhound", "Saluki", "Sloughi", "Azawakh", "Afghan Hound", "Borzoi",
         "Irish Wolfhound", "Scottish Deerhound"]),
    "terriers": (
        "Terriers, drawn to scale", "Terrier, maßstabsgetreu", "terriers-to-scale", "terrier-massstabsgetreu",
        "From the Yorkshire Terrier to the Airedale, the King of Terriers.", "Vom Yorkshire Terrier bis zum Airedale, dem König der Terrier.",
        ["Yorkshire Terrier", "Toy Fox Terrier", "Silky Terrier", "Biewer Terrier", "Toy Manchester Terrier",
         "Jack Russell Terrier", "Parson Russell Terrier", "Russell Terrier", "Cairn Terrier", "Border Terrier",
         "Wire Fox Terrier", "Smooth Fox Terrier", "Rat Terrier", "Teddy Roosevelt Terrier", "Irish Terrier",
         "Patterdale Terrier", "American Hairless Terrier", "West Highland White Terrier", "Scottish Terrier",
         "Norfolk Terrier", "Norwich Terrier", "Sealyham Terrier", "Glen of Imaal Terrier", "Australian Terrier",
         "Cesky Terrier", "Skye Terrier", "Dandie Dinmont Terrier", "Airedale Terrier", "Soft Coated Wheaten Terrier",
         "Kerry Blue Terrier", "Welsh Terrier", "Lakeland Terrier", "Bedlington Terrier", "Manchester Terrier",
         "Bull Terrier", "Miniature Bull Terrier", "Staffordshire Bull Terrier", "American Staffordshire Terrier",
         "American Pit Bull Terrier"]),
    "spitz": (
        "Spitz and Nordic breeds, drawn to scale", "Spitze und nordische Hunde, maßstabsgetreu", "spitz-nordic-to-scale",
        "spitze-nordische-hunde-massstabsgetreu",
        "From the Pomeranian to the American Akita.", "Vom Zwergspitz bis zum Amerikanischen Akita.",
        ["Pomeranian", "German Spitz (Mittel)", "Volpino Italiano", "Japanese Spitz", "Norwegian Lundehund",
         "Finnish Spitz", "Shiba Inu", "Kai Ken", "Shikoku", "Korean Jindo", "Icelandic Sheepdog", "Norwegian Buhund",
         "Finnish Lapphund", "Norwegian Elkhound", "Keeshond", "American Eskimo Dog", "Eurasier", "Chow Chow",
         "Samoyed", "Akita Inu (Japanese)", "Akita (American)", "Alaskan Klee Kai", "Siberian Husky",
         "Alaskan Malamute", "Canaan Dog"]),
    "herding": (
        "Herding dogs, drawn to scale", "Hütehunde, maßstabsgetreu", "herding-dogs-to-scale", "huetehunde-massstabsgetreu",
        "From the Lancashire Heeler to the Komondor.",
        "Vom Lancashire Heeler bis zum Komondor.",
        ["Shetland Sheepdog", "Miniature American Shepherd", "Pembroke Welsh Corgi", "Cardigan Welsh Corgi",
         "Lancashire Heeler", "Puli", "Pumi", "Mudi", "Pyrenean Shepherd", "Border Collie", "Australian Shepherd",
         "Australian Kelpie", "Australian Cattle Dog", "Polish Lowland Sheepdog", "Bearded Collie", "Rough Collie",
         "Smooth Collie", "Old English Sheepdog", "Berger Picard", "Belgian Malinois", "Belgian Tervuren",
         "Belgian Sheepdog (Groenendael)", "Belgian Laekenois", "Dutch Shepherd", "German Shepherd Dog",
         "White Swiss Shepherd Dog", "Briard", "Beauceron", "Bergamasco Sheepdog", "Komondor", "Bouvier des Flandres",
         "Czechoslovakian Wolfdog", "Saarloos Wolfdog"]),
    "molossers": (
        "Molossers and mountain dogs, drawn to scale", "Molosser und Berghunde, maßstabsgetreu",
        "molossers-mountain-dogs-to-scale", "molosser-berghunde-massstabsgetreu",
        "From the French Bulldog to the Mastiff.", "Von der Französischen Bulldogge bis zum Mastiff.",
        ["French Bulldog", "Bulldog (English)", "Boxer", "Chinese Shar-Pei", "Entlebucher Mountain Dog",
         "Appenzeller Sennenhund", "Rottweiler", "Bernese Mountain Dog", "Greater Swiss Mountain Dog", "Hovawart",
         "Dogo Argentino", "Cane Corso", "Bullmastiff", "Dogue de Bordeaux", "Boerboel", "Neapolitan Mastiff",
         "Mastiff (English)", "Tosa", "Spanish Mastiff", "Pyrenean Mastiff", "Tibetan Mastiff", "Leonberger",
         "Newfoundland", "Landseer (European)", "Saint Bernard", "Great Pyrenees", "Kangal Shepherd Dog",
         "Anatolian Shepherd Dog", "Central Asian Shepherd Dog", "Caucasian Shepherd Dog", "Estrela Mountain Dog",
         "Great Dane"]),
    "gundogs": (
        "Gun dogs, drawn to scale", "Jagdhunde, maßstabsgetreu",
        "gun-dogs-to-scale", "jagdhunde-massstabsgetreu",
        "Spaniels, retrievers, pointers and setters, from the Sussex Spaniel to the Irish Setter.",
        "Stöberhunde, Apportierhunde, Vorstehhunde und Setter, vom Sussex Spaniel bis zum Irish Red Setter.",
        ["Nederlandse Kooikerhondje", "English Cocker Spaniel", "American Cocker Spaniel", "Boykin Spaniel",
         "Welsh Springer Spaniel", "English Springer Spaniel", "Field Spaniel", "Sussex Spaniel", "Clumber Spaniel",
         "American Water Spaniel", "Brittany", "Small Münsterländer", "Large Münsterländer",
         "Nova Scotia Duck Tolling Retriever", "Labrador Retriever", "Golden Retriever", "Flat-Coated Retriever",
         "Chesapeake Bay Retriever", "Curly-Coated Retriever", "Lagotto Romagnolo", "Irish Water Spaniel", "Barbet",
         "German Shorthaired Pointer", "German Wirehaired Pointer", "Vizsla", "Wirehaired Vizsla", "Weimaraner",
         "Pointer (English)", "Bracco Italiano", "Spinone Italiano", "Wirehaired Pointing Griffon", "Irish Setter",
         "English Setter", "Gordon Setter", "Irish Red and White Setter"]),
    "scenthounds": (
        "Scent hounds, drawn to scale", "Lauf- und Schweißhunde, maßstabsgetreu", "scent-hounds-to-scale",
        "lauf-schweisshunde-massstabsgetreu",
        "From the Basset Hound to the Rhodesian Ridgeback.", "Vom Basset Hound bis zum Rhodesian Ridgeback.",
        ["Beagle", "Basset Hound", "Petit Basset Griffon Vendéen", "Grand Basset Griffon Vendéen",
         "Basset Fauve de Bretagne", "Harrier", "Bavarian Mountain Scent Hound", "English Foxhound", "American Foxhound",
         "Treeing Walker Coonhound", "Plott Hound", "Bluetick Coonhound", "Redbone Coonhound", "American English Coonhound",
         "Black and Tan Coonhound", "Otterhound", "Bloodhound", "Rhodesian Ridgeback", "Dalmatian"]),
    "companion": (
        "Companion and toy dogs, drawn to scale", "Gesellschafts- und Begleithunde, maßstabsgetreu",
        "companion-toy-dogs-to-scale", "gesellschafts-begleithunde-massstabsgetreu",
        "From the Chihuahua to the Standard Poodle.", "Vom Chihuahua bis zum Großpudel.",
        ["Chihuahua", "Russian Toy", "Papillon", "Chinese Crested", "Miniature Pinscher", "Toy Poodle", "Maltese",
         "Shih Tzu", "Havanese", "Pekingese", "Japanese Chin", "Coton de Tulear", "Bolognese", "Löwchen",
         "Russian Tsvetnaya Bolonka", "Lhasa Apso", "Tibetan Spaniel", "Pug", "Brussels Griffon", "Affenpinscher",
         "Boston Terrier", "French Bulldog", "Cavalier King Charles Spaniel", "English Toy Spaniel", "Bichon Frise",
         "Miniature Poodle", "Standard Poodle", "Kromfohrländer", "Tibetan Terrier"]),
}

COMMON = {
    "en": {"male": "Male", "female": "Female", "site": "dogsizecomparison.com",
           "tail": " Every dog is drawn at the same scale.",
           "note": "Height at the withers from the breed standards (FCI, AKC, The Kennel Club and others). Each dog is drawn at "
                   "the average of males and females; individual dogs can fall outside the standard."},
    "de": {"male": "Rüde", "female": "Hündin", "site": "dogsizecomparison.com/de",
           "tail": " Alle Hunde im selben Maßstab.",
           "note": "Widerristhöhe laut Rassestandard (u. a. FCI, AKC, The Kennel Club). Gezeichnet ist der Mittelwert aus Rüden "
                   "und Hündinnen; einzelne Hunde können außerhalb des Standards liegen."},
}


def build(key, lang, width):
    t_en, t_de, f_en, f_de, s_en, s_de, names = GROUPS[key]
    c = COMMON[lang]
    T = dict(c, title=t_de if lang == "de" else t_en, file=f_de if lang == "de" else f_en,
             sub=(s_de if lang == "de" else s_en) + c["tail"])
    breeds = load(lang, [(None, names)])[0][1]
    if lang == "en":  # "Bulldog (English)" -> "Bulldog", as on the AKC poster
        for b in breeds:
            b["name"] = DISPLAY.get(b["name"], b["name"])
    breeds.sort(key=lambda b: (b["h"], b["name"]))
    n_rows = math.ceil(len(breeds) / ROW_MAX)
    per = math.ceil(len(breeds) / n_rows)
    rows = [(None, breeds[i:i + per]) for i in range(0, len(breeds), per)]
    render(rows, T, lang, width, None)
    w, h = Image.open(os.path.join(ROOT, "img", "posters", T["file"] + ".jpg")).size
    return {"file": T["file"], "w": w, "h": h, "title": T["title"], "n": len(breeds), "sub": T["sub"]}
    print("  smallest:", breeds[0]["name"], "| largest:", breeds[-1]["name"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma-separated group keys: " + ", ".join(GROUPS))
    ap.add_argument("--lang", choices=["de", "en"], help="default: both")
    ap.add_argument("--width", type=int, default=4800)
    a = ap.parse_args()
    keys = a.only.split(",") if a.only else list(GROUPS)
    man_path = os.path.join(ROOT, "tools", "site", "group-posters.json")
    man = json.load(open(man_path)) if os.path.exists(man_path) else {}
    for k in keys:
        for lang in ([a.lang] if a.lang else ["en", "de"]):
            man.setdefault(k, {})[lang] = build(k, lang, a.width)
    # the site's poster pages (tools/site/lib.js) read this: file, size, title and breed count per poster
    man = {k: man[k] for k in GROUPS if k in man}
    with open(man_path, "w", encoding="utf-8") as f:
        json.dump(man, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
