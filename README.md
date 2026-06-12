# Projet Président Online - Frontend

Ce dépôt contient l'interface utilisateur (Frontend) complète du jeu "Président Online". Elle est construite sous forme de Single Page Application (SPA) réactive avec Vue.js 3, Vite, Pinia, Tailwind CSS et TypeScript.

---

## 🛠️ 1. Démarrer le projet en mode Développement (Local)

### Prérequis
- [Node.js](https://nodejs.org/) (version 20 ou supérieure recommandée)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

### Installation et Démarrage

1. **Cloner le dépôt :**
   ```bash
   git clone git@github.com:joran-cng/detrones-front.git
   cd detrones-front
   ```

2. **Installer les dépendances :**
   À la racine du projet, installez toutes les dépendances :
   ```bash
   pnpm install
   ```

3. **Lancer le serveur de développement :**
   ```bash
   pnpm run dev
   ```
   L'application est maintenant accessible localement à l'adresse : [http://localhost:5173](http://localhost:5173).

---

## 🧪 2. Exécuter les tests unitaires localement

Les tests unitaires vérifient la logique des composants (champs de saisie, logique d'état, boutons) et sont propulsés par **Vitest**.

Pour exécuter les tests une fois :
```bash
pnpm test
```

Pour exécuter les tests en mode d'écoute interactive (watch mode) :
```bash
pnpm run test:unit
```

---

## 🔄 3. Pipeline CI/CD et Déploiement Continu

Le projet intègre une chaîne d'intégration et de déploiement continu automatisée avec **GitHub Actions**.

### Schéma de l'Architecture CI/CD (Architecture DAG)

```mermaid
graph TD
    Developer[Développeur] -->|git push| GitHub{GitHub}
    
    subgraph Jobs de Validation (Parallèles)
        GitHub -->|Job 1| Build[Build Application]
        GitHub -->|Job 2| Tests[Unit Tests Vitest]
        GitHub -->|Job 3| Audit[Security Audit]
    end
    
    Build -->|needs: build, unit-tests, security-audit| E2E[Job 4: Playwright E2E Tests]
    Tests --> E2E
    Audit --> E2E
    
    E2E -->|needs: e2e-tests, Condition: Push sur main| Deploy[Job 5: Deploy to Vercel]
```

### Fonctionnement du Pipeline (`.github/workflows/deploy.yml`)

Le pipeline est structuré en **5 jobs distincts** qui s'exécutent de la manière suivante :
*   **Validation Parallèle** : Dès qu'une modification est soumise (Push ou Pull Request sur `main`), les jobs de validation (Build, Tests Unitaires, Audit de sécurité) démarrent en parallèle sur 3 runners différents pour un feedback immédiat.
*   **Tests End-to-End** : Si et seulement si ces 3 jobs passent au vert, le job `e2e-tests` démarre. Il s'occupe de cloner le backend, démarrer Postgres & Redis, puis lancer les tests Playwright de manière isolée.
*   **Déploiement Continu** : En cas de push sur `main`, et après succès des tests E2E, le job de déploiement pousse les fichiers de production sur **Vercel** (`vercel deploy`).

### Comment suivre les exécutions et les logs
1. Allez sur le dépôt GitHub du projet.
2. Cliquez sur l'onglet **Actions**.
3. Sélectionnez le workflow **CI/CD Frontend - VueJS** dans la barre latérale.
4. Cliquez sur le run en cours ou terminé pour voir l'avancement détaillé et les logs d'exécution de chaque étape.
