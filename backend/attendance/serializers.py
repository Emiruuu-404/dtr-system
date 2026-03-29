from rest_framework import serializers
from .models import Intern
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
