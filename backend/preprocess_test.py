import urllib.request
from PIL import Image
import numpy as np

def normalize(img_data):
    # This is typically how U2Net normalization goes in Python:
    img_data = img_data / np.max(img_data)
    img_data[:,:,0] = (img_data[:,:,0] - 0.485) / 0.229
    img_data[:,:,1] = (img_data[:,:,1] - 0.456) / 0.224
    img_data[:,:,2] = (img_data[:,:,2] - 0.406) / 0.225
    return img_data

# download bender
# ...
