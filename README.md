# Generate KHQR and Check Transaction Payment

This repository provides tools for generating KHQR (Khmer Quick Response) codes and checking transaction payments using API, implemented both in Python and as an npm package.

## Features

- **Generate KHQR Codes**: Easily generate KHQR codes for transactions in Cambodian Riel (KHR).
- **Check Transaction Payment**: Utilize APIs to check transaction payment status, providing real-time updates.
- **Python Implementation**: Includes a Python script for generating KHQR codes and checking transaction payment.
- **NPM Package**: Provides an npm package for seamless integration into Node.js projects.

## Installation

### Python

To use the Python implementation, follow these steps:

1. Install `KHQR NPM package` in the repository [link](https://socket.dev/npm/package/bakong-khqr):

   ```bash
   npm run test
   npm install bakong-khqr
   ```

2. create a `Javascript file` in the directory:

   ```bash
      const {BakongKHQR, khqrData} = require("bakong-khqr");
      const optionalData = {
          currency: khqrData.currency.khr,
          amount: 100000,
          billNumber: "#0001",
          mobileNumber: "85587575857",
          storeLabel: "Devit Huotkeo",
          terminalLabel: "Devit I",
      };
      
      const individualInfo = new IndividualInfo(
          "devit@abaa",
          khqrData.currency.khr,
          "devit",
          "Battambang",
          optionalData
      );
      
      const khqr = new BakongKHQR();
      const response = khqr.generateIndividual(individualInfo);
      
      console.log(response);
   ```

3. Install dependencies for python:

   ```bash
   pip install -r requirements.txt
   ```
4. register an account in [Bakong Openg API](https://api-bakong.nbc.gov.kh/) to get token to `Check transition using MD5`
## Support Document
[Bakong Openg API](https://api-bakong.nbc.gov.kh/)
[KHQR Guideline](https://bakong.nbc.gov.kh/download/KHQR/integration/KHQR%20Content%20Guideline%20v.1.3.pdf)
[API Document](https://bakong.nbc.gov.kh/download/KHQR/integration/Bakong%20Open%20API%20Document.pdf)
