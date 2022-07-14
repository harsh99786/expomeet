#VIEWS ARE USED TO SEE WEBPAGES OR HTML WEBPAGES

from django.shortcuts import render

from .utils import get_turn_info

# CREATING VIEWS HERE

def peer1(request):
    # GETTING THE NUMB INFO
    context = get_turn_info()

    return render(request, 'chat/peer1.html', context=context)

def peer2(request):
    # GETTING THE NUMB INFO
    context = get_turn_info()

    return render(request, 'chat/peer2.html', context=context)

def peer(request):
    # GETTING THE NUMB INFO
    context = get_turn_info()
    print('context: ', context)

    return render(request, 'chat/peer.html', context=context)