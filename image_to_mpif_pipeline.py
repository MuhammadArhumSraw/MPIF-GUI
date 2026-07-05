"""
Image → MPIF Pipeline
=====================
Converts lab notebook images into MPIF (.cif) files using Claude's vision API.

Setup:
    pip install anthropic

Usage:
    python image_to_mpif_pipeline.py image.jpg              # single image
    python image_to_mpif_pipeline.py img1.jpg img2.jpg      # multiple images
    python image_to_mpif_pipeline.py *.jpg --batch          # batch mode (50% cheaper)

Requirements:
    - Set ANTHROPIC_API_KEY environment variable
    - pip install anthropic
"""

import anthropic
import base64
import json
import sys
import os
import time
from pathlib import Path


# ── Configuration ─────────────────────────────────────────────────────────────

MODEL = "claude-sonnet-4-6"          # Best price/quality for lab image OCR
MAX_TOKENS = 4096                     # Max output tokens per image
OUTPUT_DIR = Path("mpif_outputs")     # Where .cif files are saved

# This system prompt is cached — you only pay full price for it ONCE,
# then 90% cheaper on every subsequent call (prompt caching).
SYSTEM_PROMPT = """You are a scientific data extraction specialist. Your task is to:
1. Read handwritten or printed lab notebook images carefully
2. Extract ALL synthesis information — reagents, amounts, procedures, observations
3. Output a valid MPIF (.cif) format file

MPIF FORMAT RULES:
- Start with: data_<ProductName>_<NotebookRef>
- Use ? for any field not present in the image
- All text fields must be in single quotes
- Multiline text fields use semicolons:
  field_name
  ;
  text here
  ;
- Loop tables use the loop_ keyword

REQUIRED SECTIONS (in order):
  1. Audit fields (_mpif_audit_*)
  2. Author details (_mpif_audit_contact_author_*)
  3. Product info (_mpif_product_*)
  4. Synthesis general (_mpif_synthesis_*)
  5. Substrates loop (_mpif_substrate_*)
  6. Solvents loop (_mpif_solvent_*)
  7. Catalysts loop (_mpif_catalyst_*) [optional]
  8. Vessels loop (_mpif_vessel_*)
  9. Hardware loop (_mpif_hardware_*)
  10. Procedure steps loop (_mpif_procedure_*)
  11. Full procedure (_mpif_procedure_full)

KEY FIELDS TO EXTRACT:
- Product name (from reaction title/code like COF-28, MRsk-31)
- All reagents: name, mmol, M.wt, mass in mg, ratio
- All solvents: name, volume, units
- Reaction conditions: temperature, time, atmosphere, equipment
- Step-by-step procedure
- ALL observations (color changes, precipitate formation, gel formation, etc.) — 
  observations are critical and go into procedure_detail and procedure_full
- Post-processing steps (washing solvents, drying method)

OBSERVATION NOTES: 
- Red/handwritten annotations in lab notebooks are observations — capture ALL of them
- Include in _mpif_synthesis_react_note and individual procedure _mpif_procedure_detail fields

OUTPUT ONLY the raw MPIF text. No markdown, no explanation, no code fences."""


# ── Core Functions ─────────────────────────────────────────────────────────────

def encode_image(image_path: str) -> tuple[str, str]:
    """Encode image to base64 and detect media type."""
    path = Path(image_path)
    ext = path.suffix.lower()

    media_type_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    media_type = media_type_map.get(ext, "image/jpeg")

    with open(image_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")

    return image_data, media_type


def image_to_mpif(client: anthropic.Anthropic, image_path: str) -> str:
    """
    Send a single image to Claude and get back MPIF text.
    Uses prompt caching on the system prompt to save ~90% on repeated calls.
    """
    print(f"  Processing: {image_path}")

    image_data, media_type = encode_image(image_path)

    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                # Cache the system prompt — paid once, 90% cheaper on all subsequent calls
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "Extract all synthesis data from this lab notebook image "
                            "and output a complete MPIF (.cif) file. "
                            "Capture every observation, color change, and note visible. "
                            "Use ? for any missing fields."
                        ),
                    },
                ],
            }
        ],
    )

    # Log token usage so you can track costs
    usage = response.usage
    print(f"    Tokens — input: {usage.input_tokens}, output: {usage.output_tokens}", end="")
    if hasattr(usage, "cache_read_input_tokens") and usage.cache_read_input_tokens:
        print(f", cache_read: {usage.cache_read_input_tokens}", end="")
    print()

    return response.content[0].text


def save_mpif(content: str, image_path: str) -> Path:
    """Save MPIF content to a .mpif file."""
    OUTPUT_DIR.mkdir(exist_ok=True)
    stem = Path(image_path).stem
    output_path = OUTPUT_DIR / f"{stem}.mpif"

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"    Saved: {output_path}")
    return output_path


# ── Batch API (50% cheaper, async, 24hr turnaround) ───────────────────────────

def submit_batch(client: anthropic.Anthropic, image_paths: list[str]) -> str:
    """
    Submit multiple images as a single batch request.
    50% cheaper than synchronous calls. Results ready within 24 hours.
    Returns the batch_id to poll later.
    """
    requests = []

    for image_path in image_paths:
        image_data, media_type = encode_image(image_path)
        custom_id = Path(image_path).stem  # used to match results back to files

        requests.append(
            {
                "custom_id": custom_id,
                "params": {
                    "model": MODEL,
                    "max_tokens": MAX_TOKENS,
                    "system": [
                        {
                            "type": "text",
                            "text": SYSTEM_PROMPT,
                            "cache_control": {"type": "ephemeral"},
                        }
                    ],
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": media_type,
                                        "data": image_data,
                                    },
                                },
                                {
                                    "type": "text",
                                    "text": (
                                        "Extract all synthesis data from this lab notebook image "
                                        "and output a complete MPIF (.cif) file. "
                                        "Capture every observation, color change, and note visible. "
                                        "Use ? for any missing fields."
                                    ),
                                },
                            ],
                        }
                    ],
                },
            }
        )

    batch = client.messages.batches.create(requests=requests)
    print(f"Batch submitted. ID: {batch.id}")
    print(f"Check status: client.messages.batches.retrieve('{batch.id}')")
    print("Results ready within 24 hours.")

    # Save batch_id for later retrieval
    batch_info = {"batch_id": batch.id, "image_paths": image_paths}
    with open("batch_job.json", "w") as f:
        json.dump(batch_info, f, indent=2)
    print("Batch ID saved to batch_job.json")

    return batch.id


def retrieve_batch_results(client: anthropic.Anthropic, batch_id: str, image_paths: list[str]):
    """
    Poll for batch results and save .cif files when ready.
    Call this script again after ~24 hours with --retrieve <batch_id>
    """
    batch = client.messages.batches.retrieve(batch_id)
    print(f"Batch status: {batch.processing_status}")

    if batch.processing_status != "ended":
        print(f"Not ready yet. Request counts: {batch.request_counts}")
        return

    # Build a path lookup by stem
    path_lookup = {Path(p).stem: p for p in image_paths}

    OUTPUT_DIR.mkdir(exist_ok=True)
    for result in client.messages.batches.results(batch_id):
        custom_id = result.custom_id
        if result.result.type == "succeeded":
            content = result.result.message.content[0].text
            original_path = path_lookup.get(custom_id, custom_id)
            save_mpif(content, original_path)
        else:
            print(f"  FAILED: {custom_id} — {result.result.error}")


# ── Main Pipeline ──────────────────────────────────────────────────────────────

def run_pipeline(image_paths: list[str], use_batch: bool = False):
    """
    Main entry point.
    - use_batch=False: synchronous, results immediate, standard price
    - use_batch=True:  async, results in ~24hr, 50% cheaper
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "ANTHROPIC_API_KEY not set.\n"
            "Get your key at: https://platform.anthropic.com/api-keys\n"
            "Then run: export ANTHROPIC_API_KEY='sk-ant-...'"
        )

    client = anthropic.Anthropic(api_key=api_key)

    if use_batch:
        # ── Batch mode (50% cheaper, async) ──
        print(f"\nBatch mode: submitting {len(image_paths)} image(s)...")
        submit_batch(client, image_paths)

    else:
        # ── Synchronous mode (immediate results) ──
        print(f"\nProcessing {len(image_paths)} image(s) synchronously...\n")
        results = []

        for image_path in image_paths:
            if not Path(image_path).exists():
                print(f"  SKIPPED (not found): {image_path}")
                continue
            try:
                mpif_text = image_to_mpif(client, image_path)
                output_path = save_mpif(mpif_text, image_path)
                results.append({"image": image_path, "output": str(output_path), "status": "ok"})
            except anthropic.APIError as e:
                print(f"  ERROR: {e}")
                results.append({"image": image_path, "error": str(e), "status": "failed"})
            except Exception as e:
                print(f"  UNEXPECTED ERROR: {e}")
                results.append({"image": image_path, "error": str(e), "status": "failed"})

        # Summary
        ok = [r for r in results if r["status"] == "ok"]
        print(f"\nDone. {len(ok)}/{len(results)} succeeded.")
        for r in ok:
            print(f"  {r['image']} → {r['output']}")


# ── CLI ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    args = sys.argv[1:]

    if not args:
        print(__doc__)
        sys.exit(0)

    # Retrieve a previously submitted batch
    if "--retrieve" in args:
        idx = args.index("--retrieve")
        batch_id = args[idx + 1]
        # Load image paths from saved batch info
        with open("batch_job.json") as f:
            info = json.load(f)
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        client = anthropic.Anthropic(api_key=api_key)
        retrieve_batch_results(client, batch_id, info["image_paths"])
        sys.exit(0)

    # Parse flags
    use_batch = "--batch" in args
    image_paths = [a for a in args if not a.startswith("--")]

    run_pipeline(image_paths, use_batch=use_batch)
