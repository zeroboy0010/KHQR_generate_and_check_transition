import subprocess
import qrcode
import re
import requests
import json
from time import time, sleep
# URL to which the POST request is sent
url = 'https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5'

# Headers for the POST request
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3MTk3MTMzMjQsImlhdCI6MTcxMTY3ODEyNCwiZGF0YSI6eyJpZCI6ImVmMjY3YWJmZjBhMDQwNiJ9fQ.G7ZnugstTlAooJRJcGt_HRi07sv6gJu6QGO3VeIF3-8'
}


# Path to your JavaScript file
js_file_path = '/home/zero/Desktop/KHQR_npm/test_khqr/bundle.js'

# Call Node.js to execute the JavaScript file
result = subprocess.run(['node', js_file_path], capture_output=True, text=True)

# Print the output of the JavaScript execution
print(result.stdout)
text  = result.stdout
pattern = r"'(.*?)'"
matches = re.findall(pattern, text)

print(matches[0])

qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=10,
    border=4,
)
qr.add_data(matches[0])
qr.make(fit=True)
img = qr.make_image(fill_color="black", back_color="white")
img.save("qrcode.png")

# Print any errors
print("Errors:", result.stderr)

# while 
# Send the POST request
data = {
    'md5': matches[1]
}
print(matches[1])
data_json = json.dumps(data)


# Check the status code and print the response
get_money = False
while(get_money == False):
    response = requests.post(url, headers=headers, data=data_json)
    sleep(1)
    if response.status_code == 200:
        # print('POST request was successful.')
        data = response.json()
        # print('Response Message:', data['responseMessage'])
        if data['responseMessage'] == "Success":
            get_money = True
        # print('Hash:', data['data']['hash'])
        # print('From Account ID:', data['data']['fromAccountId'])
        # print('To Account ID:', data['data']['toAccountId'])
        # print('Currency:', data['data']['currency'])
        # print('Amount:', data['data']['amount'])
        # print('Description:', data['data']['description'])
        # print('Created Date (ms):', data['data']['createdDateMs'])
        # print('Acknowledged Date (ms):', data['data']['acknowledgedDateMs'])
    else:
        print(f'POST request failed with status code {response.status_code}.')


if get_money == True :
    print("I got money HAHHAHAHHAHAHHAHAH")