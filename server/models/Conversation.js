import mongoose from 'mongoose';
const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: function() {
        return !this.serviceProvider;
      }
    },
    serviceProvider: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceProvider',
      required: function() {
        return !this.user;
      }
    },
    lastMessage: {
      type: String,
      default: ''
    },
    unreadCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// A conversation must have either a user or a service provider
conversationSchema.pre('save', function(next) {
  if (!this.user && !this.serviceProvider) {
    return next(new Error('A conversation must have either a user or a service provider'));
  }
  next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation; 