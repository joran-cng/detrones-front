import { test, expect } from '@playwright/test';

test('successful registration, lobby redirection, and game creation', async ({ page }) => {
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
  // Use waitForURL for reliable navigation detection (API call + DB can be slow)
  try {
    await page.waitForURL('/', { timeout: 20000 });
  } catch (err) {
    // If we failed to redirect, check if there's an error message on the registration screen
    const errorAlert = page.locator('.text-red-400');
    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.textContent();
      throw new Error(`Registration failed. UI error message: "${errorText?.trim()}"`);
    }
    throw err;
  }
  await expect(page.locator('h2', { hasText: 'Parties disponibles' })).toBeVisible({ timeout: 5000 });

  // 5. Cliquer sur "Créer une partie" pour ouvrir le modal
  const createGameBtn = page.getByRole('button', { name: 'Créer une partie', exact: true });
  await expect(createGameBtn).toBeVisible();
  await createGameBtn.click();

  // 6. Cliquer sur "Valider et Créer" dans le modal pour initialiser le salon sur le serveur Colyseus
  const validateBtn = page.getByRole('button', { name: 'Valider et Créer' });
  await expect(validateBtn).toBeVisible();
  await validateBtn.click();

  // 7. Vérifier que la partie a bien été créée et redirigée vers l'écran de jeu
  // data-testid="room-code" est en sr-only (toujours dans le DOM). We use toHaveText to auto-retry
  // until the 4-character uppercase alphanumeric room code is populated.
  const codeContainer = page.getByTestId('room-code');
  await expect(codeContainer).toHaveText(/^[A-Z0-9]{4}$/, { timeout: 15000 });
});
