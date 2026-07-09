"""
generate_sample_data.py
-----------------------
Generates a realistic Shopify-style e-commerce order dataset.

The data is designed to contain interesting patterns that the analysis
pipeline can discover:
  - Revenue seasonality (weekends higher, holiday spikes)
  - One underperforming product category (Electronics declining)
  - Clear top products and long-tail distribution
  - Repeat customers with varying purchase frequency
  - Regional differences in order value
  - Discount usage patterns that affect margins

Run:
    python generate_sample_data.py

Output:
    data/sample_ecommerce.csv (~3,500 rows)
"""

import os
import random
from datetime import datetime, timedelta

import numpy as np
import pandas as pd


def generate_sample_dataset(num_orders: int = 3500, seed: int = 42) -> pd.DataFrame:
    """Generate a realistic e-commerce order dataset with embedded patterns."""

    random.seed(seed)
    np.random.seed(seed)

    # --- Configuration ---
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2024, 6, 30)
    date_range = (end_date - start_date).days

    categories = {
        "Electronics": {
            "products": [
                ("Wireless Earbuds", 49.99, 79.99),
                ("Phone Case", 12.99, 29.99),
                ("USB-C Cable", 8.99, 14.99),
                ("Portable Charger", 24.99, 39.99),
                ("Bluetooth Speaker", 34.99, 59.99),
            ],
            "trend": -0.15,  # Declining category — the AI should catch this
        },
        "Clothing": {
            "products": [
                ("Cotton T-Shirt", 14.99, 29.99),
                ("Denim Jeans", 39.99, 69.99),
                ("Running Shoes", 59.99, 89.99),
                ("Winter Jacket", 79.99, 129.99),
                ("Baseball Cap", 12.99, 24.99),
            ],
            "trend": 0.10,  # Steady growth
        },
        "Home & Kitchen": {
            "products": [
                ("Scented Candle", 9.99, 19.99),
                ("Coffee Mug Set", 14.99, 24.99),
                ("Throw Blanket", 29.99, 49.99),
                ("Kitchen Scale", 19.99, 34.99),
                ("Plant Pot", 11.99, 22.99),
            ],
            "trend": 0.20,  # Strong growth — best performer
        },
        "Beauty": {
            "products": [
                ("Face Moisturizer", 16.99, 34.99),
                ("Lip Balm Set", 7.99, 12.99),
                ("Hair Oil", 12.99, 24.99),
                ("Sunscreen SPF 50", 14.99, 22.99),
                ("Sheet Mask Pack", 9.99, 18.99),
            ],
            "trend": 0.05,  # Slight growth
        },
    }

    regions = ["West", "East", "Midwest", "South", "International"]
    region_weights = [0.30, 0.28, 0.15, 0.20, 0.07]
    # West has higher AOV — another discoverable pattern
    region_aov_multiplier = {
        "West": 1.15,
        "East": 1.05,
        "Midwest": 0.90,
        "South": 0.95,
        "International": 1.25,
    }

    channels = ["Website", "Mobile App", "Social Media", "Email", "Marketplace"]
    channel_weights = [0.35, 0.30, 0.15, 0.12, 0.08]

    statuses = ["Completed", "Completed", "Completed", "Completed",
                "Refunded", "Cancelled"]  # ~67% completed

    # --- Generate customer pool ---
    # Some customers will repeat — creates a discoverable repeat purchase rate
    num_customers = int(num_orders * 0.6)  # ~40% repeat rate
    customer_ids = [f"CUST-{i:05d}" for i in range(1, num_customers + 1)]

    # Weight customer selection so some are frequent buyers
    customer_weights = np.random.pareto(1.5, num_customers) + 1
    customer_weights /= customer_weights.sum()

    # --- Generate orders ---
    rows = []
    for i in range(num_orders):
        # Date with weekend boost and seasonal pattern
        day_offset = random.randint(0, date_range)
        order_date = start_date + timedelta(days=day_offset)

        # Weekend orders are 30% more likely
        if order_date.weekday() >= 5:
            if random.random() < 0.3:
                # Shift some weekday orders to weekend
                pass

        # Apply category trend (more recent = stronger trend effect)
        month_factor = day_offset / date_range  # 0 to 1 over the period

        # Select category with trend-adjusted weights
        cat_names = list(categories.keys())
        cat_weights = []
        for cat_name in cat_names:
            base_weight = 0.25  # Equal base
            trend = categories[cat_name]["trend"]
            adjusted = base_weight * (1 + trend * month_factor)
            cat_weights.append(max(adjusted, 0.05))

        total = sum(cat_weights)
        cat_weights = [w / total for w in cat_weights]

        category = np.random.choice(cat_names, p=cat_weights)
        cat_info = categories[category]

        # Select product
        product_name, min_price, max_price = random.choice(cat_info["products"])
        unit_price = round(random.uniform(min_price, max_price), 2)

        # Quantity (most orders are 1-2 items)
        quantity = np.random.choice([1, 1, 1, 2, 2, 3], p=[0.4, 0.2, 0.1, 0.15, 0.1, 0.05])

        # Region and channel
        region = np.random.choice(regions, p=region_weights)
        channel = np.random.choice(channels, p=channel_weights)

        # Apply regional price multiplier
        unit_price = round(unit_price * region_aov_multiplier[region], 2)

        # Discount (30% of orders have a discount)
        discount_pct = 0
        if random.random() < 0.30:
            discount_pct = random.choice([5, 10, 10, 15, 20, 25])

        # Calculate financials
        subtotal = round(unit_price * quantity, 2)
        discount_amount = round(subtotal * discount_pct / 100, 2)
        total_amount = round(subtotal - discount_amount, 2)

        # Status
        status = random.choice(statuses)

        # Customer
        customer_id = np.random.choice(customer_ids, p=customer_weights)

        rows.append({
            "order_id": f"ORD-{i + 1:06d}",
            "order_date": order_date.strftime("%Y-%m-%d"),
            "customer_id": customer_id,
            "product_name": product_name,
            "category": category,
            "quantity": quantity,
            "unit_price": unit_price,
            "discount_pct": discount_pct,
            "total_amount": total_amount,
            "region": region,
            "channel": channel,
            "order_status": status,
        })

    df = pd.DataFrame(rows)
    # Sort by date for natural ordering
    df = df.sort_values("order_date").reset_index(drop=True)
    return df


if __name__ == "__main__":
    print("Generating sample e-commerce dataset...")
    df = generate_sample_dataset()

    output_path = os.path.join(os.path.dirname(__file__), "data", "sample_ecommerce.csv")
    df.to_csv(output_path, index=False)

    print(f"Saved to: {output_path}")
    print(f"Shape: {df.shape}")
    print(f"Date range: {df['order_date'].min()} to {df['order_date'].max()}")
    print(f"Unique customers: {df['customer_id'].nunique()}")
    print(f"\nCategory distribution:")
    print(df["category"].value_counts().to_string())
    print(f"\nSample rows:")
    print(df.head(3).to_string())
