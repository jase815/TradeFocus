const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, var(--app-bg-gradient-top) 0%, var(--app-bg-gradient-bottom) 100%)",
    padding: "clamp(18px, 3vw, 32px) clamp(14px, 3vw, 20px)",
    fontFamily: "Arial, sans-serif",
    width: "100%",
    maxWidth: "100%",
    overflowX: "hidden",
  },

  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },

  title: {
    margin: 0,
    fontSize: "clamp(28px, 5vw, 36px)",
    color: "var(--app-text)",
    fontWeight: 800,
  },

  subtitle: {
    margin: "8px 0 0 0",
    color: "var(--app-text-soft)",
    fontSize: "15px",
  },

  statusBox: {
    background: "var(--app-card)",
    borderRadius: "var(--app-radius-lg)",
    padding: "16px 18px",
    boxShadow: "var(--app-shadow-card)",
    minWidth: "180px",
    border: "1px solid var(--app-card-border)",
  },

  statusPill: {
    display: "inline-block",
    background: "var(--app-chip)",
    color: "var(--app-chip-text)",
    borderRadius: "var(--app-radius-pill)",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "8px",
  },

  statusText: {
    color: "var(--app-text-soft)",
    fontSize: "14px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },

  statCard: {
    background: "linear-gradient(180deg, var(--app-card) 0%, var(--app-card-muted) 100%)",
    borderRadius: "22px",
    padding: "clamp(16px, 3vw, 20px)",
    boxShadow: "var(--app-shadow-card)",
    border: "1px solid var(--app-card-border)",
    width: "100%",
    minWidth: 0,
  },

  statLabel: {
    color: "var(--app-text-soft)",
    fontSize: "14px",
    marginBottom: "8px",
  },

  statValue: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "var(--app-text)",
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
    gap: "20px",
    marginBottom: "24px",
  },

  card: {
    background: "linear-gradient(180deg, var(--app-card) 0%, var(--app-card-muted) 100%)",
    borderRadius: "22px",
    padding: "clamp(18px, 3vw, 24px)",
    boxShadow: "var(--app-shadow-card)",
    border: "1px solid var(--app-card-border)",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflowWrap: "anywhere",
  },

  cardTitle: {
    marginTop: 0,
    marginBottom: "18px",
    color: "var(--app-text)",
    fontWeight: 800,
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    marginBottom: "12px",
    borderRadius: "14px",
    border: "1px solid var(--app-input-border)",
    fontSize: "14px",
    boxSizing: "border-box",
    background: "var(--app-input-bg)",
    color: "var(--app-text)",
    outline: "none",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  },

  textarea: {
    width: "100%",
    minHeight: "90px",
    padding: "12px 14px",
    marginBottom: "12px",
    borderRadius: "14px",
    border: "1px solid var(--app-input-border)",
    fontSize: "14px",
    resize: "vertical",
    boxSizing: "border-box",
    background: "var(--app-input-bg)",
    color: "var(--app-text)",
    outline: "none",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  },

  twoCol: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
    gap: "12px",
  },

  buttonRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  primaryButton: {
    background: "linear-gradient(135deg, var(--app-primary) 0%, var(--app-primary-hover) 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "14px",
    padding: "12px 16px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 10px 20px color-mix(in srgb, var(--app-primary) 28%, transparent)",
  },

  secondaryButton: {
    background: "linear-gradient(135deg, var(--app-nav) 0%, color-mix(in srgb, var(--app-nav) 72%, var(--app-primary) 28%) 100%)",
    color: "var(--app-nav-text)",
    border: "none",
    borderRadius: "14px",
    padding: "12px 16px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "var(--app-shadow-soft)",
  },

  ghostButton: {
    background: "var(--app-primary-soft)",
    color: "var(--app-chip-text)",
    border: "1px solid var(--app-primary-border)",
    borderRadius: "14px",
    padding: "12px 16px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  tradesHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "14px",
    flexWrap: "wrap",
  },

  tradeList: {
    display: "grid",
    gap: "14px",
  },

  tradeCard: {
    border: "1px solid var(--app-card-border)",
    borderRadius: "18px",
    padding: "16px",
    background: "linear-gradient(180deg, var(--app-card) 0%, var(--app-card-muted) 100%)",
    width: "100%",
    minWidth: 0,
  },

  tradeTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "10px",
    flexWrap: "wrap",
  },

  tradeSymbol: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "var(--app-text)",
    marginBottom: "4px",
    overflowWrap: "anywhere",
  },

  tradeNote: {
    color: "var(--app-text-soft)",
    fontSize: "14px",
  },

  tradeMeta: {
    display: "flex",
    gap: "18px",
    flexWrap: "wrap",
    color: "var(--app-text-soft)",
    fontSize: "14px",
    marginBottom: "14px",
  },

  pnlBadge: {
    borderRadius: "var(--app-radius-pill)",
    padding: "8px 12px",
    fontWeight: "bold",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },

  tradeActions: {
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: "10px",
  },

  deleteButton: {
    background: "linear-gradient(135deg, var(--app-danger) 0%, color-mix(in srgb, var(--app-danger) 86%, white 14%) 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    padding: "10px 14px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 10px 20px color-mix(in srgb, var(--app-danger) 22%, transparent)",
  },

  emptyState: {
    padding: "30px",
    textAlign: "center",
    color: "var(--app-text-soft)",
    background: "var(--app-card-muted)",
    borderRadius: "16px",
    border: "1px dashed var(--app-input-border)",
  },
};

export default styles;
