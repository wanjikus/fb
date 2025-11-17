#!/usr/bin/env python3
"""
open_facebook_selenium.py

Simple Selenium script (Python) that opens https://www.facebook.com, waits for the page
to load, prints the page title, and saves a screenshot.

Requirements:
  pip install selenium webdriver-manager

Usage:
  python open_facebook_selenium.py            # opens with visible Chrome window
  python open_facebook_selenium.py --headless # runs Chrome headless

Notes:
 - This script uses webdriver-manager to automatically download the correct ChromeDriver.
 - If you prefer Firefox, swap Chrome classes for Firefox equivalents and use GeckoDriverManager.
 - This script does NOT perform login. Automating login to Facebook may violate their terms of service.
"""

import argparse
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


def open_facebook(headless: bool = False, timeout: int = 15):
    """Open facebook.com with Selenium (Chrome)."""
    options = webdriver.ChromeOptions()
    # Uncomment to disable GPU and sandbox if running in some CI containers
    # options.add_argument("--no-sandbox")
    # options.add_argument("--disable-dev-shm-usage")

    if headless:
        options.add_argument("--headless=new")  # use new headless mode for modern Chrome
        # When headless, set window size so screenshots render consistently
        options.add_argument("--window-size=1280,1024")

    # Optional: set a common user agent (helps some sites treat you like a normal browser)
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36"
    )

    # Create driver using webdriver-manager to handle chromedriver binary
    service = ChromeService(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)

    try:
        url = "https://www.facebook.com/"
        print(f"Opening {url} ...")
        driver.get(url)

        # Wait until the email input is present (indicates the login page loaded)
        wait = WebDriverWait(driver, timeout)
        wait.until(EC.presence_of_element_located((By.ID, "email")))

        # Print page title and current URL
        print("Page title:", driver.title)
        print("Current URL:", driver.current_url)

        # Save a screenshot
        screenshot_path = "facebook_home.png"
        driver.save_screenshot(screenshot_path)
        print(f"Saved screenshot to {screenshot_path}")

        # Keep window open briefly so human can see (only when not headless)
        if not headless:
            print("Waiting 5 seconds before closing browser...")
            time.sleep(5)

    finally:
        driver.quit()
        print("Browser closed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Open Facebook with Selenium (Chrome).")
    parser.add_argument(
        "--headless", "-h", action="store_true", help="Run Chrome in headless mode."
    )
    args = parser.parse_args()
    open_facebook(headless=args.headless)
