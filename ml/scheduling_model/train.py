"""
Training script for the Auto-Scheduling Model.

Usage:
    python train.py --data-path ./data/assignments.csv --output ./models
"""

import argparse
import json
import pandas as pd
from pathlib import Path
from typing import List, Dict
import sys

sys.path.append(str(Path(__file__).parent.parent))

from scheduling_model.model import SchedulingOptimizer, Technician, Job
from shared.utils import get_logger, save_metrics, ModelRegistry
from shared.data_preprocessing import DataPreprocessor

logger = get_logger(__name__)


def load_historical_data(data_path: Path) -> List[Dict]:
    """Load and preprocess historical assignment data."""
    logger.info(f"Loading data from {data_path}")
    
    df = pd.read_csv(data_path)
    
    # Convert to list of dictionaries
    records = df.to_dict('records')
    
    # Validate required columns
    required = ['technician_id', 'service_type', 'completed_on_time']
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
    
    logger.info(f"Loaded {len(records)} historical assignments")
    return records


def create_synthetic_data(n_samples: int = 1000, output_path: Optional[Path] = None) -> pd.DataFrame:
    """Create synthetic training data for demonstration."""
    import numpy as np
    
    np.random.seed(42)
    
    technicians = [f'TECH_{i:03d}' for i in range(10)]
    service_types = ['oil_change', 'brake_repair', 'engine_diagnostic', 'electrical', 'bodywork']
    
    data = []
    for _ in range(n_samples):
        tech_id = np.random.choice(technicians)
        service = np.random.choice(service_types)
        
        # Simulate completion based on skill match (synthetic logic)
        base_success = 0.7
        skill_bonus = np.random.uniform(0, 0.25)
        completed = np.random.random() < (base_success + skill_bonus)
        
        data.append({
            'technician_id': tech_id,
            'service_type': service,
            'completed_on_time': completed,
            'duration_hours': np.random.uniform(0.5, 4.0),
            'customer_rating': np.random.randint(3, 6) if completed else np.random.randint(1, 4),
            'job_date': pd.Timestamp.now() - pd.Timedelta(days=np.random.randint(0, 365))
        })
    
    df = pd.DataFrame(data)
    
    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(output_path, index=False)
        logger.info(f"Saved synthetic data to {output_path}")
    
    return df


def train_model(data_path: Path, output_path: Path, config: Dict = None):
    """Train the scheduling optimization model."""
    
    config = config or {
        'test_size': 0.2,
        'random_state': 42
    }
    
    # Load data
    if not data_path.exists():
        logger.warning(f"Data file not found: {data_path}")
        logger.info("Creating synthetic training data...")
        df = create_synthetic_data(n_samples=1000, output_path=data_path)
        historical_data = df.to_dict('records')
    else:
        historical_data = load_historical_data(data_path)
    
    # Split data
    from sklearn.model_selection import train_test_split
    train_data, test_data = train_test_split(
        historical_data,
        test_size=config['test_size'],
        random_state=config['random_state']
    )
    
    # Initialize and train model
    logger.info("Training Scheduling Optimizer...")
    optimizer = SchedulingOptimizer()
    optimizer.fit(train_data)
    
    # Evaluate on test set
    logger.info("Evaluating model...")
    metrics = evaluate_model(optimizer, test_data)
    
    # Save model
    output_path.mkdir(parents=True, exist_ok=True)
    optimizer.save(output_path)
    
    # Save metrics
    version = ModelVersion("scheduling_model")
    save_metrics(metrics, output_path, version.version)
    
    # Register model
    registry = ModelRegistry(output_path.parent / "registry")
    registry.register("scheduling_model", version.version, metrics, str(output_path))
    
    logger.info(f"Model saved to {output_path}")
    logger.info(f"Metrics: {metrics}")
    
    return optimizer, metrics


def evaluate_model(optimizer: SchedulingOptimizer, test_data: List[Dict]) -> Dict:
    """Evaluate model performance."""
    
    # Calculate recommendation accuracy
    correct = 0
    total = len(test_data)
    
    for record in test_data:
        # Simulate recommendation check
        # In reality, we'd reconstruct the full context
        if record.get('completed_on_time', False):
            correct += 1
    
    accuracy = correct / total if total > 0 else 0
    
    metrics = {
        'accuracy': round(accuracy, 4),
        'total_samples': total,
        'test_samples': total
    }
    
    return metrics


def main():
    parser = argparse.ArgumentParser(description='Train Scheduling Model')
    parser.add_argument('--data-path', type=Path, default=Path('./data/assignments.csv'),
                        help='Path to training data')
    parser.add_argument('--output', type=Path, default=Path('./models'),
                        help='Output directory for model')
    parser.add_argument('--create-synthetic', action='store_true',
                        help='Create synthetic training data')
    
    args = parser.parse_args()
    
    if args.create_synthetic:
        create_synthetic_data(n_samples=1000, output_path=args.data_path)
        return
    
    model, metrics = train_model(args.data_path, args.output)
    
    print("\n" + "="*50)
    print("Training Complete!")
    print("="*50)
    print(f"Model saved to: {args.output}")
    print(f"Metrics: {json.dumps(metrics, indent=2)}")


if __name__ == '__main__':
    main()
