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
  const lobbyHeader = page.locator('h2', { hasText: 'Parties disponibles' });
  await expect(lobbyHeader).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveURL('/');

  // 5. Cliquer sur "Créer une partie" pour ouvrir le modal
  const createGameBtn = page.getByRole('button', { name: 'Créer une partie' });
  await expect(createGameBtn).toBeVisible();
  await createGameBtn.click();

  // 6. Cliquer sur "Valider et Créer" dans le modal pour initialiser le salon sur le serveur Colyseus
  const validateBtn = page.getByRole('button', { name: 'Valider et Créer' });
  await expect(validateBtn).toBeVisible();
  await validateBtn.click();

  // 7. Vérifier que la partie a bien été créée (apparition du message vert et du code de salon)
  const successMessage = page.locator('p', { hasText: 'Partie créée !' });
  await expect(successMessage).toBeVisible({ timeout: 15000 });

  // 8. S'assurer que le code de partie s'affiche (un texte majuscule de 4 lettres dans la classe font-mono)
  const codeContainer = page.locator('.font-mono');
  await expect(codeContainer).toBeVisible();
  const code = await codeContainer.textContent();
  expect(code?.trim().length).toBe(4);
});
