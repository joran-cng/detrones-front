import { test, expect } from '@playwright/test';

test('successful registration redirects to lobby', async ({ page }) => {
  const randNum = Math.floor(Math.random() * 1000000);
  const username = `e2e_user_${randNum}`;
  const email = `e2e_${randNum}@example.com`;
  const password = `password_${randNum}`;

  // 1. Accéder à la page d'inscription
  await page.goto('/register');

  // 2. Remplir le formulaire
  await page.locator('#input-adresse-email').fill(email);
  await page.locator('#input-pseudo').fill(username);
  await page.locator('#input-mot-de-passe').fill(password);
  await page.locator('#input-confirmer-le-mot-de-passe').fill(password);

  // 3. Soumettre le formulaire
  const submitButton = page.getByRole('button', { name: 'Créer mon compte' });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  // 4. Vérifier la redirection vers le lobby (Home)
  // Nous vérifions que nous arrivons sur le tableau de bord avec le titre "Parties disponibles"
  const lobbyHeader = page.locator('h2', { hasText: 'Parties disponibles' });
  await expect(lobbyHeader).toBeVisible({ timeout: 10000 });

  // Optionnel : s'assurer que l'URL est bien "/"
  await expect(page).toHaveURL('/');
});
