# Ready-made certificate designs

The certificate dialog offers these designs as starting points. They are **not bundled
with the portal**: the files are served from S3, and the list of designs is the
`certificateTemplates` key in the shared config
`https://aastar-assets.s3.ap-south-1.amazonaws.com/data/cbp-data.json`.

To add, change or remove a design, update S3. No portal build or deploy is needed.
The config is cached for up to 5 minutes per session.

The SVG files are kept only on S3, in `s3://aastar-assets/cbp_certificate_templates/`
(currently `classic.svg`, `modern.svg` and `elegant.svg`). To change a design,
download it from there, edit it and upload it again.

## Adding a design

1. Build the SVG the same way as the ones here:
   - canvas 1350 x 808;
   - only fonts the certificate renderer has (`CERT_FONTS`);
   - wording and rules marked `data-cert="text|line"`;
   - background rect marked `data-cert-bg="true"`;
   - learner fields as `{{credentialSubject.*}}` tokens sitting on a rule;
   - QR code as `<image id="QrCode" xlink:href="{{qrCode}}">`;
   - no learner details typed into the artwork;
   - under 50 KB.
2. Check it before uploading: open it in the certificate dialog with **Upload File**.
   It should show no warnings, and the name, course, date and QR code should already be placed.
3. Upload it to `s3://aastar-assets/cbp_certificate_templates/` with content type
   `image/svg+xml`.
4. Add an entry to `certificateTemplates` in `cbp-data.json`:

```json
"certificateTemplates": [
  {
    "id": "classic",
    "name": "Classic",
    "description": "Framed and formal, with a serif title.",
    "url": "https://aastar-assets.s3.ap-south-1.amazonaws.com/cbp_certificate_templates/classic.svg"
  }
]
```

Each entry needs:

- `id`: unique and stable;
- `name`;
- `url`: must be `https://`.

`description` is optional. An entry that breaks these rules is skipped, not shown
broken.

The cards appear in the order listed:

- **Up to 5 designs:** shown on one screen beside the upload option.
- **More than 5:** the creator first chooses between **Use a ready-made design** and
  **Upload your own design**. The first leads to a searchable list.
