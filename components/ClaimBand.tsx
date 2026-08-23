import { ClaimForm, type ClaimPlantOption } from "@/components/forms/ClaimForm";
import Link from "next/link";

export function ClaimBand({
  plants,
  preset,
  withForm = false,
}: {
  plants: ClaimPlantOption[];
  preset?: ClaimPlantOption;
  withForm?: boolean;
}) {
  return (
    <section className="claim-band" id="claim" aria-labelledby="claim-heading">
      <h2 id="claim-heading">Plant on this list?</h2>
      <p>
        If we have your company, claim the profile so facts stay current. If we missed you, tell us
        which page on your site to read.
      </p>
      {withForm ? (
        <ClaimForm plants={plants} preset={preset} />
      ) : (
        <p>
          <Link className="btn btn-gold" href="/claim-submit">
            Claim or submit a plant
          </Link>
        </p>
      )}
      <p className="note">
        Food and beverage manufacturers only. We still verify against your public site.
      </p>
    </section>
  );
}
