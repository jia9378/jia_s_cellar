# Jia's Cellar

Plain HTML, CSS and JS. No build step.

- `index.html` front page (newspaper masthead and lead story), `projects.html` index of works, `about.html` about and contact
- Case studies: `cdefgab.html`, `uselace.html`, `the-pulse.html`, `cell-ar.html`. Duplicate one for a new project and change `data-skin`
- `style.css` shared styles and per-project skins, `script.js` shared behaviour
- `images/thumbs/<project>.jpg` plate thumbnails, `images/<project>/` case study images
- Case study figures are the project's process sheets exported from the Figma file
  (one page per project), saved as 1800 px JPEGs and shown whole with `.sheet`, which links to
  the full-size file
- `download/Jiayang_He_Resume.pdf` resume linked from the nav

## Visual system

The site is set like a printed sheet: warm newsprint, Cormorant Garamond for tracked
capitals, EB Garamond for text, JetBrains Mono for annotations. Shared marks live in
section 3 of `style.css`:

- `.label` / `.label--filled` boxed tabs, as in the process sheets
- `.crop` printer's crop marks, `.graph` engineering paper
- `.titleblock` architect's title block (project meta, footer)
- `.dropcap`, `.columns`, `.jump` newspaper text setting

Each project is shown as a plate (`.plate[data-skin]`) in its own palette and type. If
`images/thumbs/<project>.jpg` exists it covers the plate; otherwise the typographic poster
stays. Each page's footer title block has a sheet number; update them if pages are added.
