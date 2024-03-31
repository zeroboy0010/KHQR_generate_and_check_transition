const { BakongKHQR, khqrData, IndividualInfo } = require("bakong-khqr");
const optionalData = {
    currency: khqrData.currency.khr,
    amount: 100,
    billNumber: "#0020",
    mobileNumber: "885183232096",
    storeLabel: "Zero",
    terminalLabel: "Zero",
};

const individualInfo = new IndividualInfo(
    "kimhoir_na_2002@abaa",
    khqrData.currency.khr,
    "Kimhoir",
    "Phnom Penh",
    optionalData
);

const khqr = new BakongKHQR();
const response = khqr.generateIndividual(individualInfo);

console.log(response);


