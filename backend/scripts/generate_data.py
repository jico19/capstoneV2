import pandas as pd
import numpy as np


def run():
    # Load the base naturalized data
    df = pd.read_csv("./datasets/naturalized_hog_survey.csv")

    synthetic = []

    # Multiplier defines how many synthetic records to generate per base record
    # Reduced slightly to avoid "OA" (exaggerated) data volume
    MULTIPLIER = 2

    breakdown_cols = ["inahin", "barako", "fattener", "grower", "starter", "bulaw"]

    for _, row in df.iterrows():

        for _ in range(MULTIPLIER):

            new_row = row.copy()

            # 1. Temporal variation: random survey date (2025-2027)
            # We add a slight growth trend over time (approx 5% per year)
            date = pd.Timestamp(
                np.random.choice(pd.date_range("2023-01-01", "2026-06-30", freq="D"))
            )
            new_row["survey_date"] = date

            years_from_start = (date.year - 2023) + (date.dayofyear / 365.0)
            growth_factor = 1.0 + (years_from_start * 0.05)

            # 2. Owners variation: +/- 20%
            owners = row["num_owners"]
            new_row["num_owners"] = max(
                1, int(round(owners * np.random.uniform(0.8, 1.2)))
            )

            # 3. Pigs variation: We vary the breakdown categories individually
            # This ensures the total_pigs always matches the sum of its parts.
            current_total = 0
            for col in breakdown_cols:
                val = row[col]
                # Variation of +/- 30% for each category, plus growth factor
                varied_val = int(
                    round(val * np.random.uniform(0.7, 1.3) * growth_factor)
                )
                # Add occasional small random counts to zero columns to simulate new activity
                if varied_val == 0 and np.random.random() < 0.05:
                    varied_val = np.random.randint(1, 3)

                new_row[col] = varied_val
                current_total += varied_val

            # Update total pigs to be consistent
            new_row["total_pigs"] = current_total

            # 4. Spatial variation: Larger spread to avoid overlapping clusters
            # 0.002 degrees is approx 220 meters, better for barangay-level distribution
            if "latitude" in row:
                new_row["latitude"] = row["latitude"] + np.random.normal(0, 0.002)

            if "longitude" in row:
                new_row["longitude"] = row["longitude"] + np.random.normal(0, 0.002)

            # Only add if we actually have pigs
            if current_total > 0:
                synthetic.append(new_row)

    synthetic_df = pd.DataFrame(synthetic)

    # Sort by date for cleaner look
    synthetic_df = synthetic_df.sort_values(by="survey_date")

    # Output to the project root for easy access by upload scripts/actions
    synthetic_df.to_csv("synthetic_hog_data.csv", index=False)
    print(f"Generated {len(synthetic_df)} naturalized synthetic records.")
