# Phase E provider and design review

Checked 2026-09-19. This is a source/price review, not evidence that a new generation has succeeded.

## Seedance 2.5: available, outside the existing balance

Kie's current primary documentation lists `bytedance/seedance-2-5` at
https://docs.kie.ai/market/bytedance/seedance-2-5 . Its first/last-frame mode is
mutually exclusive with multimodal reference arrays. The documented duration
range is 4–30 seconds, with 480p, 720p and 1080p output options. First/last-frame
constraints are a useful control, not proof that intermediate geometry is artifact-free.

The live Kie pricing page (https://kie.ai/pricing, search `seedance`) showed:

| Input / output | Credits per output second |
| --- | ---: |
| First/last images, 480p (`no video`) | 28 |
| First/last images, 720p (`no video`) | 63 |
| First/last images, 1080p (`no video`) | 158 |
| Video reference, 480p (`with video`) | 17 |
| Video reference, 720p (`with video`) | 38 |
| Video reference, 1080p (`with video`) | 95 |

These table labels distinguish reference-video input; they are not audio switches.
The authenticated, read-only credit endpoint returned 38 credits at
2026-09-19T09:06:15.0662561Z. A five-second 720p first/last-frame request would
therefore need 315 credits. No Seedance task or credit purchase was submitted.
The credential was read in memory and was not emitted or added to this repository.

## Wan 3.0: separate provider/account

The user-specified https://wan30ai.com/wan-3 generator calls itself Wave AI.
Its footer explicitly says it is independent and is not affiliated with the
original model provider. Do not describe this website as an official Alibaba service.

The authenticated UI showed 30 existing credits. Standard image-to-video has
first-frame and optional last-frame uploads, a 2–30 second duration control,
and 480P/720P/1080P choices. The displayed five-second cost was 20 credits at
480P and 40 credits at 720P. Merely selecting settings did not submit a task.
Any eventual task, its exact selected price and its result require a separate receipt.

Kie also documents `wan/3-0-video` and `wan/3-0-video-prime` at
https://docs.kie.ai/market/wan/3-0-video and
https://docs.kie.ai/market/wan/3-0-video-prime . The live Kie standard pricing
table showed 8 / 16 / 32 credits per second for 480p / 720p / 1080p respectively.
Do not combine the credit balances or pricing systems of the two services.

## New user inspiration

The user's Threads share https://www.threads.com/share/BBPtPIVUfT/ resolved to
https://www.threads.com/@textura.eu/post/DdZzk3xDDLM . Its visible demonstration
is a coffee landing page. The useful visual observations are dominant realistic
product photography, thin outlined information cards, restrained typography,
ivory/charcoal section contrast, and specific information placed beside the
product. These inform the specimen presentation without replacing the approved
particle hero. The post's promotional claims about model quality are not treated
as independently verified technical facts.

The reference video was inspected locally as an ignored `local-*` review file.
Its artwork, branding, footage, and code are not copied into the application.

## Acceptance boundaries

- An external approach followed by a fade is not a lens-entry solution.
- A clean, image-driven approach is acceptable only when described honestly;
  it must not be called a physical 3D camera simulation.
- A generated crossing needs visual inspection of the entire sequence, not
  just a successful task status or an `ended` event.
- Preserve the existing particle field, counter, data provenance and Finance name.
- No purchases, top-ups, production database writes or main-branch merge.
