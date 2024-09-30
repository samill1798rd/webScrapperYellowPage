import { test } from '@playwright/test';
import fs from 'fs';

// Define a dictionary of business categories and corresponding search terms
const businessCategories = {
  'Find People': 'people',
  'Restaurants': 'restaurants',
  'Dentists': 'dentists',
  'Plumbers': 'plumbers',
  'Contractors': 'contractors',
  'Electricians': 'electricians',
  'Auto Repair': 'auto repair',
  'Roofing': 'roofing',
  'Attorneys': 'attorneys',
  'Hotels': 'hotels'
};

// Function to scrape Yellow Pages based on category and city
test('Scrape Yellow Pages by Category', async ({ page }) => {
  const city = 'New York';  // City can be dynamically changed
  const selectedCategory = 'Restaurants'; // Choose from the businessCategories dictionary

  // Check if the selected category exists in the dictionary
  if (!businessCategories[selectedCategory]) {
    console.error('Category not found!');
    return;
  }

  const categorySearchTerm = businessCategories[selectedCategory];

  // Navigate to Yellow Pages and perform the search
  await page.goto('https://www.yellowpages.com/');
  
  // Input the city and category into the search fields
  await page.locator('input[name="search_terms"]').fill(categorySearchTerm);
  // Input the city into the location field using the correct selector
  await page.locator('#location').fill(city, {force:true});  // Use #location to target the city input
  await page.click('button[type="submit"]');

  // Wait for search results to load
  await page.waitForSelector('.business-name');

  // Scrape business names, addresses, and phone numbers
  const businesses = await page.$$eval('.result', (businesses) =>
    businesses.map((business) => {
      const name = business.querySelector('.business-name')?.textContent;
      const address = business.querySelector('.street-address')?.textContent || 'No address available';
      const phone = business.querySelector('.phones')?.textContent || 'No phone available';
      return { name, address, phone };
    })
  );

  // Write the results to a CSV file
  const csvStream = fs.createWriteStream(`yellowpages_${categorySearchTerm}_results.csv`);
  csvStream.write('Name,Address,Phone\n'); // Headers
  businesses.forEach((business) => {
    csvStream.write(`${business.name},${business.address},${business.phone}\n`);
  });
  csvStream.end();

  console.log(`Scraped ${businesses.length} businesses and saved to yellowpages_${categorySearchTerm}_results.csv`);
});
