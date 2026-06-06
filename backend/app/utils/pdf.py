def render_html_to_pdf_bytes(html: str, *, base_url: str | None = None) -> bytes:
    try:
        from weasyprint import HTML
    except Exception as exc:  # pragma: no cover - runtime dependency guard
        raise RuntimeError("weasyprint is required for PDF generation") from exc

    return HTML(string=html, base_url=base_url).write_pdf()
