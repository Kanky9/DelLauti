const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { setGlobalOptions } = require('firebase-functions/v2/options');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

admin.initializeApp();

setGlobalOptions({
  region: 'southamerica-east1',
  maxInstances: 10
});

const WEBAPP_SHIFT_ADMIN_URL = 'https://dellauti-5413f.web.app/shift-admin';

exports.sendAdminPushOnShiftBooked = onDocumentCreated('adminNotifications/{notificationId}', async (event) => {
  const notificationData = event.data?.data();

  if (!notificationData || notificationData.type !== 'shift_booked') {
    return;
  }

  const usersSnapshot = await admin.firestore()
    .collection('users')
    .where('admin', '==', true)
    .get();

  const tokens = [];
  const tokenOwners = new Map();

  usersSnapshot.forEach((userDoc) => {
    const userData = userDoc.data();
    const userTokens = Array.isArray(userData.pushTokens)
      ? userData.pushTokens.filter((token) => typeof token === 'string' && token.length > 0)
      : [];

    for (const token of userTokens) {
      tokens.push(token);
      tokenOwners.set(token, userDoc.ref);
    }
  });

  if (tokens.length === 0) {
    logger.info('No hay tokens push de admins para enviar notificacion.', {
      notificationId: event.params.notificationId
    });
    return;
  }

  const title = 'Nuevo turno reservado';
  const body = typeof notificationData.message === 'string' && notificationData.message.trim().length > 0
    ? notificationData.message
    : 'Tienes una nueva reserva de turno.';

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title,
      body
    },
    data: {
      type: 'shift_booked',
      notificationId: String(event.params.notificationId || ''),
      shiftId: String(notificationData.shiftId || ''),
      url: WEBAPP_SHIFT_ADMIN_URL
    },
    webpush: {
      notification: {
        title,
        body,
        icon: 'https://dellauti-5413f.web.app/icons/icon-192x192.png',
        badge: 'https://dellauti-5413f.web.app/icons/icon-72x72.png',
        tag: `shift-booked-${event.params.notificationId}`,
        renotify: true,
        requireInteraction: true
      },
      fcmOptions: {
        link: WEBAPP_SHIFT_ADMIN_URL
      }
    }
  });

  const invalidTokensByUserPath = new Map();

  response.responses.forEach((sendResponse, index) => {
    if (sendResponse.success) {
      return;
    }

    const token = tokens[index];
    const ownerRef = tokenOwners.get(token);
    const errorCode = sendResponse.error?.code || 'unknown';

    logger.error('Error enviando push a token admin.', {
      token,
      errorCode
    });

    if (
      errorCode === 'messaging/registration-token-not-registered' ||
      errorCode === 'messaging/invalid-registration-token'
    ) {
      if (ownerRef) {
        const existingTokens = invalidTokensByUserPath.get(ownerRef.path) ?? [];
        existingTokens.push(token);
        invalidTokensByUserPath.set(ownerRef.path, existingTokens);
      }
    }
  });

  if (invalidTokensByUserPath.size > 0) {
    await Promise.all(
      Array.from(invalidTokensByUserPath.entries()).map(async ([userPath, invalidTokens]) => {
        const userRef = admin.firestore().doc(userPath);
        await userRef.update({
          pushTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
        });
      })
    );
  }

  logger.info('Notificacion push enviada a admins.', {
    totalTokens: tokens.length,
    successCount: response.successCount,
    failureCount: response.failureCount
  });
});
