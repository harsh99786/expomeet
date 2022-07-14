from django.conf import settings

# IT RETURNS NUMB TURN CREDENTIAL AND USERNAME
def get_turn_info():
    return {
        'numb_turn_credential': settings.NUMB_TURN_CREDENTIAL,
        'numb_turn_username': settings.NUMB_TURN_USERNAME,
    }