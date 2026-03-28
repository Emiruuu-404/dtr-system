from rest_framework import serializers
from .models import Intern, ChatMessage
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['student_id'] = user.student_id
        token['name'] = user.name
        token['email'] = user.email
        return token

class InternSerializer(serializers.ModelSerializer):
    class Meta:
        model = Intern
        fields = ('student_id', 'name', 'email', 'password')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = Intern.objects.create_user(**validated_data)
        return user

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.name', read_only=True)
    sender_student_id = serializers.CharField(source='sender.student_id', read_only=True)
    receiver_name = serializers.CharField(source='receiver.name', read_only=True, allow_null=True)
    receiver_student_id = serializers.CharField(source='receiver.student_id', read_only=True, allow_null=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'sender_name', 'sender_student_id', 'receiver', 'receiver_name', 'receiver_student_id', 'content', 'timestamp', 'is_read']
