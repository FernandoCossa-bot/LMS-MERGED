# Tzu Chi Mozambique LMS

Static client-side LMS demo ready for deployment on Render.

## Deploy on Render

1. Push this repository to GitHub.
2. In Render, choose **New -> Blueprint** and select the repository.
3. Render will detect `render.yaml` and create the static site.

The app lives in `TZU CHI MOZ LMS V2/`. It has no build step; the folder is published as-is. The rewrite rule in `render.yaml` keeps browser refreshes and deep links working.
