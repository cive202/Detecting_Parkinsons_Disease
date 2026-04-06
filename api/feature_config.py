"""API JSON keys in the same order as notebook features (df.drop status, name)."""

# Pandas column names from parkinsons.data
FEATURE_COLUMNS = [
    "MDVP:Fo(Hz)",
    "MDVP:Fhi(Hz)",
    "MDVP:Flo(Hz)",
    "MDVP:Jitter(%)",
    "MDVP:Jitter(Abs)",
    "MDVP:RAP",
    "MDVP:PPQ",
    "Jitter:DDP",
    "MDVP:Shimmer",
    "MDVP:Shimmer(dB)",
    "Shimmer:APQ3",
    "Shimmer:APQ5",
    "MDVP:APQ",
    "Shimmer:DDA",
    "NHR",
    "HNR",
    "RPDE",
    "DFA",
    "spread1",
    "spread2",
    "D2",
    "PPE",
]

# Keys sent by the Next.js form (must match parkinsons-form.tsx)
API_KEYS = [
    "MDVP_Fo_Hz",
    "MDVP_Fhi_Hz",
    "MDVP_Flo_Hz",
    "MDVP_Jitter_Percent",
    "MDVP_Jitter_Abs",
    "MDVP_RAP",
    "MDVP_PPQ",
    "Jitter_DDP",
    "MDVP_Shimmer",
    "MDVP_Shimmer_dB",
    "Shimmer_APQ3",
    "Shimmer_APQ5",
    "MDVP_APQ",
    "Shimmer_DDA",
    "NHR",
    "HNR",
    "RPDE",
    "DFA",
    "spread1",
    "spread2",
    "D2",
    "PPE",
]

API_KEY_TO_COLUMN = dict(zip(API_KEYS, FEATURE_COLUMNS))
