# Nginx Conf File Generator

This is a simple **Nginx configuration file generator** built using **vanilla JavaScript**. The tool helps generate Nginx config files for both **Laravel** and **Next.js** applications, and it can optionally generate a **PM2 deployment script** for Next.js apps. It also supports **HTTPS** configurations using **Let's Encrypt SSL certificates**.

## Features

- **Generate Nginx config** for Laravel or Next.js applications.
- **Supports HTTPS** configuration with SSL certificates.
- **Generate PM2 deployment script** for Next.js apps.
- Allows you to specify **app name**, **root folder path**, and **server names**.
- Configures **static files**, **PHP-FPM** for Laravel, and **proxying** for Next.js.
- **Simple web interface** with vanilla JavaScript to generate configuration files.

## Installation

### Files Required

1. **index.html** - The main HTML page where users can input values.
2. **script.js** - The JavaScript file that generates the Nginx config and PM2 deployment script.

### Steps to Run Locally

1. Clone the repository or download the project files.

2. Open the `index.html` file in your browser.

3. Use the form on the page to generate the **Nginx config** and **PM2 script**.

## Usage

1. **App Name**: Enter the name of your application (e.g., `MyAwesomeApp`).
2. **Root Folder Path**: Enter the root folder path of your application (e.g., `/var/www/my-awesome-app`).
3. **Server Names**: Input the server names (space-separated list, e.g., `example.com www.example.com`).
4. Optionally, check the box to **use HTTPS** (recommended for production).
5. If you're deploying a **Next.js** app, check the box to **Generate PM2 Script**.
6. Optionally, input the **port number** for your Next.js application (required if using Next.js).

After filling in the details, click the **Generate Scripts** button. The tool will generate:

- **Nginx Configuration** for Laravel or Next.js.
- **PM2 Deployment Script** (if selected for Next.js).


