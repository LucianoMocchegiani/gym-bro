import styles from "./page.module.css";

/**
 * Placeholder del panel web (Admin / Super Admin) hasta E10.
 */
export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>GymBro Web</h1>
        <p>Panel Admin / Super Admin (scaffold). API en puerto 3001.</p>
      </main>
    </div>
  );
}
