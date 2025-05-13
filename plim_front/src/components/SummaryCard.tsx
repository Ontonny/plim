import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string | number;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value }) => {
  return (
    <div style={styles.card}>
      <h3>{title}</h3>
      <p style={styles.value}>{value}</p>
    </div>
  );
};

const styles = {
  card: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center' as 'center',
    marginBottom: '20px',
  },
  value: {
    fontSize: '24px',
    fontWeight: 'bold' as 'bold',
  },
};

export default SummaryCard;
