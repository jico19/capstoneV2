import json
from apps.maps.models import Barangay
from django.db import transaction

sariaya_barangays = [
    {"name": "Antipolo", "lat": 13.9792, "lng": 121.5065},
    {"name": "Balubal", "lat": 13.9634, "lng": 121.5190},
    {"name": "Barangay 1", "lat": 13.9612, "lng": 121.5228},
    {"name": "Barangay 2", "lat": 13.9633, "lng": 121.5245},
    {"name": "Barangay 3", "lat": 13.9642, "lng": 121.5261},
    {"name": "Barangay 4", "lat": 13.9628, "lng": 121.5289},
    {"name": "Barangay 5", "lat": 13.9610, "lng": 121.5240},
    {"name": "Barangay 6", "lat": 13.9622, "lng": 121.5232},
    {"name": "Bignay 1", "lat": 13.9385, "lng": 121.5136},
    {"name": "Bignay 2", "lat": 13.9361, "lng": 121.5078},
    {"name": "Bucal", "lat": 13.9893, "lng": 121.5231},
    {"name": "Canda", "lat": 13.9784, "lng": 121.5312},
    {"name": "Castañas", "lat": 13.9328, "lng": 121.5287},
    {"name": "Concepcion Banahaw", "lat": 13.9954, "lng": 121.5032},
    {"name": "Concepcion No. 1", "lat": 13.9705, "lng": 121.5184},
    {"name": "Concepcion Palasan", "lat": 13.9719, "lng": 121.5401},
    {"name": "Concepcion Pinagbakuran", "lat": 13.9750, "lng": 121.5327},
    {"name": "Gibanga", "lat": 13.9865, "lng": 121.5472},
    {"name": "Guisguis-San Roque", "lat": 13.9456, "lng": 121.5208},
    {"name": "Guisguis-Talon", "lat": 13.9471, "lng": 121.5150},
    {"name": "Janagdong 1", "lat": 13.9961, "lng": 121.5383},
    {"name": "Janagdong 2", "lat": 13.9938, "lng": 121.5440},
    {"name": "Limbon", "lat": 13.9877, "lng": 121.5309},
    {"name": "Lutucan 1", "lat": 13.9654, "lng": 121.5103},
    {"name": "Lutucan Bata", "lat": 13.9692, "lng": 121.5081},
    {"name": "Lutucan Malabag", "lat": 13.9720, "lng": 121.5037},
    {"name": "Mamala 1", "lat": 14.0048, "lng": 121.5039},
    {"name": "Mamala 2", "lat": 14.0023, "lng": 121.5084},
    {"name": "Manggalang 1", "lat": 13.9560, "lng": 121.5035},
    {"name": "Manggalang Tulo-Tulo", "lat": 13.9527, "lng": 121.4969},
    {"name": "Manggalang-Bantilan", "lat": 13.9494, "lng": 121.5037},
    {"name": "Manggalang-Kiling", "lat": 13.9431, "lng": 121.4990},
    {"name": "Montecillo", "lat": 13.9824, "lng": 121.5205},
    {"name": "Morong", "lat": 13.9872, "lng": 121.5114},
    {"name": "Pili", "lat": 13.9888, "lng": 121.5179},
    {"name": "Sampaloc 1", "lat": 14.0123, "lng": 121.5158},
    {"name": "Sampaloc 2", "lat": 14.0068, "lng": 121.5225},
    {"name": "Sampaloc Bogon", "lat": 14.0151, "lng": 121.5274},
    {"name": "Santo Cristo", "lat": 13.9677, "lng": 121.5332},
    {"name": "Talaan Aplaya", "lat": 13.9355, "lng": 121.5418},
    {"name": "Talaan Pantoc", "lat": 13.9408, "lng": 121.5364},
    {"name": "Tumbaga 1", "lat": 13.9589, "lng": 121.5388},
    {"name": "Tumbaga 2", "lat": 13.9613, "lng": 121.5426},
]

@transaction.atomic
def run():
    # print(len(sariaya_barangays))

    with open ('./datasets/barangays-municity-1323-sariaya.json', 'r') as file:
        data = json.load(file)

        for barangay in range(0, len(sariaya_barangays)):
            print(data["features"][barangay]["properties"]['NAME_3'])
            Barangay.objects.create(
                name = data["features"][barangay]["properties"]['NAME_3'],
                latitude = sariaya_barangays[barangay]['lat'],
                longitude = sariaya_barangays[barangay]['lng'],
                geojson = data["features"][barangay]["geometry"]['coordinates']
            )
        print("Done creating barangay.")

