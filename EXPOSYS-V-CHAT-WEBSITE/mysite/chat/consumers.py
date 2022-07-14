import json
from channels.generic.websocket import AsyncWebsocketConsumer
import asyncio

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self): # WHENEVER CLIENT CONNECTS TO CONSUMER

        self.room_group_name = 'Test-Room' # GROUPS ARE LIKE ROOMS THEY CONTAIN CHANNEL NAMES

        await self.channel_layer.group_add(  # USERS HAVE TO ADD THEM TO THIS GROUP 
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self,close_code): # WHENEVER CLIENT DISCONNECTS 
        
        await self.channel_layer.group_discard( # DISCARD USER FROM THE ROOM
            self.room_group_name,
            self.channel_name
        )

        print('You are Disconnected!')
        

    # RECEIVE MESSAGE FROM WEBSOCKET
    async def receive(self, receive_data): # WHENEVER A MESSAGE IS RECEIVED FROM CLIENT
        receive_dict = json.loads(receive_data)
        peer_username = receive_dict['peer']
        action = receive_dict['action']
        message = receive_dict['message']

        # PRINT('UNANSWERED_OFFERS: ', SELF.UNANSWERED_OFFERS)

        print('Message received: ', message)

        print('peer_username: ', peer_username)
        print('action: ', action)
        print('self.channel_name: ', self.channel_name)

        if(action == 'new-offer') or (action =='new-answer'):
            # IN CASE ITS A NEW OFFER OR ANSWER
            # SEND IT TO THE NEW PEER OR INITIAL OFFERER RESPECTIVELY

            receiver_channel_name = receive_dict['message']['receiver_channel_name']

            print('Sending to ', receiver_channel_name)

            # SET NEW RECEIVER AS THE CURRENT SENDER
            receive_dict['message']['receiver_channel_name'] = self.channel_name

            await self.channel_layer.send(
                receiver_channel_name,
                {
                    'type': 'send.sdp',
                    'receive_dict': receive_dict,
                }
            )

            return

        # SET NEW RECEIVER AS THE CURRENT SENDER SO THAT SOME MESSAGES CAN BE SENT TO THIS CHANNEL SPECIFICALLY
        receive_dict['message']['receiver_channel_name'] = self.channel_name

        # SEND TO ALL PEERS
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send.sdp',
                'receive_dict': receive_dict,
            }
        )

    async def send_sdp(self, event):
        receive_dict = event['receive_dict']

        this_peer = receive_dict['peer']
        action = receive_dict['action']
        message = receive_dict['message']
        # DUMPS IS USED IN CONVERSION FROM PYTHON TO JSON
        await self.send(receive_data=json.dumps({
            'peer': this_peer,
            'action': action,
            'message': message,
        }))