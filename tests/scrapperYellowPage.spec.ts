import { test } from '@playwright/test';
import fs from 'fs';

// Define the type for a business
interface Business {
  name: string;
  address: string;
  phone: string;
}

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

// Function to scrape Yellow Pages based on category and city, with pagination support
test('Scrape Yellow Pages with Pagination', async ({ page }) => {
  const city = 'New York';  // City can be dynamically changed
  const selectedCategory = 'Auto Repair'; // Choose from the businessCategories dictionary

  // Check if the selected category exists in the dictionary
  if (!businessCategories[selectedCategory]) {
    console.error('Category not found!');
    return;
  }

  const categorySearchTerm = businessCategories[selectedCategory];

  // Navigate to Yellow Pages and perform the search
  await page.goto('https://www.yellowpages.com/');
  
  // Input the category into the search field
  await page.fill('input[name="search_terms"]', categorySearchTerm);
  
  // Input the city into the location field using the correct selector
  await page.fill('#location', city, { force: true });  // Use #location to target the city input

  // Submit the form to perform the search
  await page.click('button[type="submit"]');

  let allBusinesses: Business[] = []; // Initialize the array with the correct type

  // Loop through pagination and scrape data
  while (true) {
    // Wait for search results to load
    await page.waitForSelector('.business-name');

    // Scrape business names, addresses, and phone numbers
    const businesses: Business[] = await page.$$eval('.result', (businesses) =>
      businesses.map((business) => {
        const name = business.querySelector('.business-name')?.textContent || 'No name available';
        const address = business.querySelector('.street-address')?.textContent || 'No address available';
        const phone = business.querySelector('.phones')?.textContent || 'No phone available';
        return { name, address, phone };
      })
    );

    // Append the current page's businesses to the full list
    allBusinesses = allBusinesses.concat(businesses); // Explicitly typed

    // Check if a "Next" button exists for pagination
    const nextButtonSelector = 'a.next.ajax-page'; // Use the selector for the "Next" button
    const nextButtonVisible = await page.waitForSelector(nextButtonSelector, { state: 'visible' });

    if (nextButtonVisible) {
      try {
        // Re-fetch the element before clicking
        const nextButton = await page.$(nextButtonSelector);
        if (nextButton) {
          // Click the "Next" button and wait for the next page to load
          await Promise.all([
            nextButton.click(),
            page.waitForLoadState('networkidle'), // Wait for the page to load
          ]);
        }
      } catch (error) {
        console.error('Failed to click the next button:', error);
        break; // Optionally break or continue based on your logic
      }
    } else {
      // No more pages, exit the loop
      break;
    }
  }

  // Write the results to a CSV file
  const csvStream = fs.createWriteStream(`yellowpages_${categorySearchTerm}_results.csv`);
  csvStream.write('Name,Address,Phone\n'); // Headers
  allBusinesses.forEach((business) => {
    csvStream.write(`${business.name},${business.address},${business.phone}\n`);
  });
  csvStream.end();

  console.log(`Scraped ${allBusinesses.length} businesses and saved to yellowpages_${categorySearchTerm}_results.csv`);
});
