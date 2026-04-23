from datetime import date
from pathlib import Path

from jinja2 import Template

_TEMPLATE_PATH = Path(__file__).parent.parent / "templates" / "reimbursement_template.html"


def generate_reimbursement_template(aggregated_results: dict, output_path: str) -> str:
    """
    Render a Business Travel Settlement PDF from aggregated receipt results.

    aggregated_results: output of process_receipts()
    output_path: absolute path where the PDF will be saved.
    Returns output_path on success.
    """
    try:
        from xhtml2pdf import pisa
    except ImportError:
        raise RuntimeError("xhtml2pdf is not installed. Run: uv add xhtml2pdf")

    html_src = _TEMPLATE_PATH.read_text(encoding="utf-8")
    template = Template(html_src)
    html_content = template.render(
        **aggregated_results,
        generated_date=date.today().strftime("%Y-%m-%d"),
    )

    with open(output_path, "wb") as out_file:
        status = pisa.CreatePDF(html_content, dest=out_file)

    if status.err:
        raise RuntimeError(f"PDF generation failed with {status.err} error(s)")

    return output_path
