# Luna Quilling

## Preview and publish the website

### Preview locally

The build generates `catalog.json` in both the project root and `dist/`. The root copy supports GitHub Pages deployments serving the repository root; the `dist/` copy supports the local preview and Actions artifact deployment. From PowerShell in the project folder run:

```powershell
.\watch-site.ps1
```

Keep that PowerShell window open while working. It builds the site immediately and rebuilds `dist/` when supported images are added, changed, or deleted. Open `http://127.0.0.1:8001` in your browser and refresh after the build completes. To build once without watching:

```powershell
.\build-site.ps1
```

To stop watching, press Ctrl+C. The preview server can also be run separately if it is not already running:

```powershell
.\preview-site.ps1
```

The project root is the source; `dist/` is generated output. Do not add images directly to `dist/`, because the next build replaces its gallery files from the source folders. Keep the generated root `catalog.json` in Git so branch-based GitHub Pages deployments can load the image list; the publishing workflow refreshes it when image files change.

### Publish on GitHub Pages

1. In the public `lunaquilling/lunaquilling` repository, open **Settings → Pages** and select **GitHub Actions** as the source.
2. Push changes to the `main` branch. The included workflow rebuilds `dist/` and deploys it.
3. After the **Publish website** workflow succeeds, open **Settings → Pages** to find the public URL.

The enquiry form continues to use the existing Google Apps Script URL in `config.js`.

## Add or remove images

- Add or delete portfolio artwork in the project-root `works/` folder.
- Add or delete inspiration images in the project-root `refences/` folder.
- Keep `watch-site.ps1` running to refresh the local build automatically. Without the watcher, run `.\build-site.ps1` after changing images.
- For the public website, push the source-folder changes to GitHub; the **Publish website** workflow rebuilds and deploys the galleries.

The build automatically finds supported JPG, JPEG, PNG and WEBP images. Existing `WK` and `RF` image IDs stay the same; new images get the next available ID automatically.

## Important files and folders

- `works/` and `refences/`: source images; add and delete images here.
- `build-site.ps1`: builds the catalogue and generated `dist/` website.
- `watch-site.ps1`: watches both source image folders and rebuilds after changes.
- `preview-site.ps1`: serves the generated site locally at `http://127.0.0.1:8001`.
- `index.html`, `styles.css`, `script.js`, and `config.js`: existing website files; normally do not edit these when changing gallery images.
- `.github/workflows/pages.yml`: builds and publishes the site on GitHub Pages.
- `work-ids.json` and `reference-ids.json`: preserve gallery IDs as filenames are added or removed; leave these in the project.
- `dist/`: generated output; do not manage images here or edit it directly.
