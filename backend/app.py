import os
import argparse
from datetime import timedelta, datetime, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, get_jwt_identity, jwt_required
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import or_
from passlib.hash import bcrypt

# Initialize extensions
db = SQLAlchemy()

def create_app():
    app = Flask(__name__)

    # Config
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///app.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Extensions
    CORS(app, resources={r"/api/*": {"origins": os.getenv("ALLOW_ORIGINS", "http://localhost:3000").split(",")}}, supports_credentials=True)
    JWTManager(app)
    db.init_app(app)

    # Routes
    @app.route("/api/health", methods=["GET"])
    def health():
        return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}

    # Auth
    @app.route("/api/auth/register", methods=["POST"])
    def register():
        data = request.get_json() or {}
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        password = (data.get("password") or "").strip()
        if not name or not email or not password:
            return {"message": "name, email and password are required"}, 400
        if User.query.filter_by(email=email).first():
            return {"message": "Email already registered"}, 409
        user = User(name=name, email=email, password_hash=bcrypt.hash(password))
        db.session.add(user)
        db.session.commit()
        token = create_access_token(identity=str(user.id))
        return {"user": user.to_dict_basic(), "token": token}

    @app.route("/api/auth/login", methods=["POST"])
    def login():
        data = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()
        password = (data.get("password") or "").strip()
        user = User.query.filter_by(email=email).first()
        if not user or not bcrypt.verify(password, user.password_hash):
            return {"message": "Incorrect email or password"}, 401
        token = create_access_token(identity=str(user.id))
        return {"user": user.to_dict_basic(), "token": token}

    # Contacts
    @app.route("/api/contacts", methods=["GET"])
    @jwt_required()
    def list_contacts():
        current_user_id = int(get_jwt_identity())
        search = (request.args.get("search") or "").strip().lower()
        sort = request.args.get("sort") or "name"

        query = Contact.query.filter_by(user_id=current_user_id)
        if search:
            like = f"%{search}%"
            query = query.filter(
                or_(
                    Contact.name.ilike(like),
                    Contact.email.ilike(like),
                    Contact.phone.ilike(like),
                )
            )

        if sort == "favorites":
            query = query.order_by(Contact.is_favorite.desc(), Contact.name.asc())
        else:
            query = query.order_by(Contact.name.asc())

        contacts = [c.to_dict() for c in query.all()]
        return {"contacts": contacts}

    @app.route("/api/contacts", methods=["POST"])
    @jwt_required()
    def create_contact():
        current_user_id = int(get_jwt_identity())
        data = request.get_json() or {}
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        phone = (data.get("phone") or "").strip()
        company = (data.get("company") or "").strip()
        notes = (data.get("notes") or "").strip()
        if not name or not email:
            return {"message": "name and email are required"}, 400
        contact = Contact(
            user_id=current_user_id,
            name=name,
            email=email,
            phone=phone,
            company=company,
            notes=notes,
        )
        db.session.add(contact)
        db.session.commit()
        return contact.to_dict(), 201

    @app.route("/api/contacts/<int:contact_id>", methods=["PUT"])
    @jwt_required()
    def update_contact(contact_id: int):
        current_user_id = int(get_jwt_identity())
        contact = Contact.query.filter_by(id=contact_id, user_id=current_user_id).first()
        if not contact:
            return {"message": "Contact not found"}, 404
        data = request.get_json() or {}
        for field in ["name", "email", "phone", "company", "notes"]:
            if field in data and isinstance(data[field], str):
                setattr(contact, field, data[field].strip())
        db.session.commit()
        return contact.to_dict()

    @app.route("/api/contacts/<int:contact_id>", methods=["DELETE"])
    @jwt_required()
    def delete_contact(contact_id: int):
        current_user_id = int(get_jwt_identity())
        contact = Contact.query.filter_by(id=contact_id, user_id=current_user_id).first()
        if not contact:
            return {"message": "Contact not found"}, 404
        db.session.delete(contact)
        db.session.commit()
        return {"success": True}

    @app.route("/api/contacts/<int:contact_id>/toggle-favorite", methods=["POST"])
    @jwt_required()
    def toggle_favorite(contact_id: int):
        current_user_id = int(get_jwt_identity())
        contact = Contact.query.filter_by(id=contact_id, user_id=current_user_id).first()
        if not contact:
            return {"message": "Contact not found"}, 404
        contact.is_favorite = not contact.is_favorite
        db.session.commit()
        return contact.to_dict()

    return app


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    contacts = db.relationship("Contact", backref="user", lazy=True)

    def to_dict_basic(self):
        return {"id": self.id, "name": self.name, "email": self.email}


class Contact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(64))
    company = db.Column(db.String(255))
    notes = db.Column(db.Text)
    is_favorite = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "company": self.company,
            "notes": self.notes,
            "isFavorite": self.is_favorite,
            "createdAt": self.created_at.isoformat(),
        }


def init_db(app: Flask):
    with app.app_context():
        db.create_all()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--init-db", action="store_true")
    args = parser.parse_args()

    app = create_app()
    if args.init_db:
        init_db(app)
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)