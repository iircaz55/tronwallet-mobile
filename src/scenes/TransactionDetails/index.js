import React from 'react'
import moment from 'moment'
import { ScrollView, Clipboard, View, Text } from 'react-native'
import { string, number, bool, shape, array } from 'prop-types'
import Ionicons from 'react-native-vector-icons/Ionicons'
import Toast from 'react-native-easy-toast'
import LinearGradient from 'react-native-linear-gradient'
import styled from 'styled-components'

import IconButton from '../../components/IconButton'
import * as Utils from '../../components/Utils'
import * as Elements from './Elements'
import NavigationHeader from '../../components/Navigation/Header'
import { Colors } from '../../components/DesignSystem'
import { ONE_TRX } from '../../services/client'
import { rgb } from '../../../node_modules/polished'
import Copiable from './CopiableAddress'

class TransactionDetails extends React.Component {
  static navigationOptions = ({ navigation }) => {
    return {
      header: (
        <NavigationHeader
          title='TRANSACTION'
          onBack={() => navigation.goBack()}
          // rightButton={
          //   <TouchableOpacity onPress={() => { }}>
          //     <Feather name='share-2' color='white' size={21} />
          //   </TouchableOpacity>
          // }
        />
      )
    }
  }

  static propTypes = {
    navigation: shape({
      state: shape({
        params: shape({
          id: string,
          type: string,
          timestamp: number,
          ownerAddress: string,
          confirmed: bool,
          block: string,
          contractData: shape({
            tokenName: string,
            transferFromAddress: string,
            transferToAddress: string,
            amount: number,
            frozenBalance: number,
            description: string,
            startTime: number,
            endTime: number,
            totalSupply: number,
            unityValue: number,
            votes: array
          })
        })
      })
    })
  }

  _copy = async () => {
    const { id } = this.props.navigation.state.params.item
    try {
      await Clipboard.setString(id)
      this.refs.toast.show('Hash Key copied to the clipboard')
    } catch (error) {
      this.refs.toast.show('Something wrong while copying')
    }
  }

  _renderCard = () => {
    const { id, confirmed, timestamp, block } = this.props.navigation.state.params.item

    return (
      <React.Fragment>
        <Utils.View style={{
          position: 'absolute',
          right: 20,
          top: 75,
          zIndex: 999
        }}>
          <IconButton icon='md-clipboard' bg={Colors.summaryText} iconColor='#FFFFFF' onPress={() => this._copy()} />
        </Utils.View>
        <Utils.View
          borderRadius={10}
          marginTop={20}
          borderTopWidth={10}
          borderTopColor={confirmed ? Colors.confirmed : Colors.unconfirmed}
          overflow='hidden'
        >
          <LinearGradient
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            colors={[Colors.transactionCardGradient[0], Colors.transactionCardGradient[1]]}
          >
            <View style={{
              marginHorizontal: 18,
              marginVertical: 20
            }}>
              <Utils.Row align='center' justify='space-between'>
                <Elements.DetailLabel>HASH</Elements.DetailLabel>
              </Utils.Row>
              <View style={{height: 10}} />
              <Text style={{
                fontFamily: 'Rubik-Regular',
                fontSize: 14,
                lineHeight: 24,
                marginRight: 40,
                color: 'white'
              }}>{id}</Text>
              <View style={{
                height: 1,
                backgroundColor: 'black',
                marginTop: 16,
                marginBottom: 20
              }} />
              <View>
                <Utils.Column>
                  <Utils.Row align='center' justify='space-between'>
                    <Elements.DetailLabel>STATUS</Elements.DetailLabel>
                    <Utils.VerticalSpacer />
                    <Elements.DetailText>{confirmed ? 'Confirmed' : 'Unconfirmed'}</Elements.DetailText>
                  </Utils.Row>
                  <Utils.VerticalSpacer size='medium' />
                  <Utils.Row align='center' justify='space-between'>
                    <Elements.DetailLabel>BLOCK</Elements.DetailLabel>
                    <Elements.DetailText>{block}</Elements.DetailText>
                  </Utils.Row>
                  <Utils.VerticalSpacer size='medium' />
                  <Utils.Row align='center' justify='space-between'>
                    <Elements.DetailLabel>TIME</Elements.DetailLabel>
                    <Elements.DetailText>{moment(timestamp).format('DD/MM/YYYY hh:mm A')}</Elements.DetailText>
                  </Utils.Row>
                </Utils.Column>
              </View>
            </View>
          </LinearGradient>
        </Utils.View>
      </React.Fragment>
    )
  }

  _getHeaderBadgeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'create':
        return '#94C047'
      case 'unfreeze':
        return 'teal'
      case 'freeze':
        return '#25B9E3'
      case 'participate':
        return '#6442E4'
      case 'vote':
        return '#BB2DC4'
      default:
        return '#4a69e2'
    }
  }

  _getHeaderArrowIcon = (type) => {
    const lowerType = type.toLowerCase()

    if (lowerType === 'unfreeze') {
      return (
        <Ionicons
          name='ios-unlock'
          size={45}
          color='#ffffff'
        />
      )
    }
    if (lowerType === 'freeze') {
      return (
        <Ionicons
          name='ios-lock'
          size={45}
          color='#ffffff'
        />
      )
    }
    if (lowerType === 'participate') {
      return (
        <Ionicons
          name='ios-arrow-round-up'
          size={45}
          color='green'
        />
      )
    }
    if (lowerType === 'vote' || lowerType === 'transaction') {
      return (
        <Ionicons
          name='ios-arrow-round-down'
          size={45}
          color='red'
        />
      )
    }
    return null
  }

  _getHeaderToken = (type, tokenName) => {
    if (type.toLowerCase() === 'vote') return 'TP'
    if (tokenName) return tokenName
    return 'TRX'
  }

  _getHeaderAmountText = (type) => {
    switch (type.toLowerCase()) {
      case 'freeze':
        return 'FROZEN BALANCE'
      case 'unfreeze':
        return 'UNFROZEN BALANCE'
      case 'vote':
        return 'TOTAL VOTES'
      default:
        return 'AMOUNT'
    }
  }

  _getHeaderAmount = () => {
    const { type, contractData: { amount, frozenBalance, votes } } = this.props.navigation.state.params.item

    switch (type.toLowerCase()) {
      case 'freeze':
        return frozenBalance
      case 'unfreeze':
        return frozenBalance
      case 'vote':
        return votes.length
      default:
        return amount
    }
  }

  _renderHeader = () => {
    const { type, contractData: { tokenName } } = this.props.navigation.state.params.item

    const tokenToDisplay = this._getHeaderToken(type, tokenName)
    const amountText = this._getHeaderAmountText(type)
    const amountValue = this._getHeaderAmount()
    const convertedAmount = tokenToDisplay === 'TRX' ? amountValue / ONE_TRX : amountValue

    return (
      <View style={{
        alignItems: 'center'
      }}>
        <View style={{
          borderRadius: 5,
          height: 22,
          backgroundColor: this._getHeaderBadgeColor(type),
          justifyContent: 'center',
          paddingHorizontal: 10}}>
          <Elements.BadgeText>{type.toUpperCase()}</Elements.BadgeText>
        </View>
        <View style={{height: 15}} />
        {type.toLowerCase() !== 'create' &&
          <React.Fragment>
            <Text style={{
              fontFamily: 'Rubik-Medium',
              fontSize: 11,
              lineHeight: 11,
              letterSpacing: 0.6,
              color: '#7476a2'
            }}>{amountText}</Text>
            <Utils.Row align='center'>
              <Elements.AmountText>{convertedAmount < 1 ? convertedAmount : convertedAmount.toFixed(2)}</Elements.AmountText>
              <View style={{width: 11, height: 1}} />
              <View style={{backgroundColor: rgb(46, 47, 71),
                borderRadius: 2,
                opacity: 0.97,
                height: 24,
                justifyContent: 'center',
                paddingHorizontal: 8}}>
                <Elements.BadgeText>{tokenToDisplay}</Elements.BadgeText>
              </View>
              <Utils.HorizontalSpacer size='medium' />
              {this._getHeaderArrowIcon(type)}
            </Utils.Row>
          </React.Fragment>
        }
      </View>
    )
  }

  _truncateAddress = address => `${address.substring(0, 8)}...${address.substring(address.length - 8, address.length)}`

  _renderToFrom = () => {
    const { type, contractData: { transferFromAddress, transferToAddress } } = this.props.navigation.state.params.item
    const TempText = styled.Text`
      font-family: Helvetica;
      font-size: 13;
      line-height: 20;
      color: white;
      flex: 1;
    `
    return (
      <View>
        {type.toLowerCase() === 'transfer' &&
          <React.Fragment>
            <View style={{justifyContent: 'space-between', alignItems: 'center', flexDirection: 'row'}}>
              <Text style={{
                fontFamily: 'Rubik-Medium',
                fontSize: 11,
                lineHeight: 11,
                letterSpacing: 0.6,
                color: rgb(116, 118, 162)
              }}>TO</Text>
              <Ionicons
                name='ios-arrow-round-up'
                size={30}
                color={rgb(102, 104, 143)}
              />
            </View>
            <View style={{flexDirection: 'row', width: '100%'}}>
              <Copiable
                TextComponent={TempText}
                showToast={this._showToast}>
                {transferToAddress}
              </Copiable>
            </View>
            <View style={{height: 15}} />
            <Utils.View height={1} background='#51526B' />
            <View style={{height: 15}} />
          </React.Fragment>
        }
        <View style={{justifyContent: 'space-between', alignItems: 'center', flexDirection: 'row'}}>
          <Text style={{
            fontFamily: 'Rubik-Medium',
            fontSize: 11,
            lineHeight: 11,
            letterSpacing: 0.6,
            color: rgb(116, 118, 162)
          }}>FROM</Text>
          <Ionicons
            name='ios-arrow-round-down'
            size={30}
            color={rgb(102, 104, 143)}
          />
        </View>
        <Copiable
          TextComponent={TempText}
          showToast={this._showToast}>
          {transferFromAddress}
        </Copiable>
      </View>
    )
  }

  _renderCreateBody = () => {
    const {
      tokenName, unityValue, totalSupply, startTime, endTime, description
    } = this.props.navigation.state.params.item.contractData

    return (
      <Utils.Content>
        <Utils.Row>
          <Utils.Column>
            <Elements.Label>TOKEN NAME</Elements.Label>
            <Utils.VerticalSpacer size='xsmall' />
            <Elements.TokenText>{tokenName}</Elements.TokenText>
          </Utils.Column>
          <Utils.Column position='absolute' left='50%'>
            <Elements.Label>UNITY VALUE</Elements.Label>
            <Utils.VerticalSpacer size='xsmall' />
            <Elements.TokenText>{(unityValue / ONE_TRX).toFixed(2)} TRX</Elements.TokenText>
          </Utils.Column>
        </Utils.Row>
        <Utils.VerticalSpacer size='big' />
        <Utils.Column>
          <Elements.Label>TOTAL SUPPLY</Elements.Label>
          <Utils.VerticalSpacer size='xsmall' />
          <Elements.AmountText>{totalSupply}</Elements.AmountText>
        </Utils.Column>
        <Utils.VerticalSpacer size='big' />
        <Utils.Row>
          <Utils.Column>
            <Elements.Label>START TIME</Elements.Label>
            <Utils.VerticalSpacer size='xsmall' />
            <Elements.DescriptionText>{moment(startTime).format('DD/MM/YYYY hh:mm A')}</Elements.DescriptionText>
          </Utils.Column>
          <Utils.Column position='absolute' left='50%'>
            <Elements.Label>END TIME</Elements.Label>
            <Utils.VerticalSpacer size='xsmall' />
            <Elements.DescriptionText>{moment(endTime).format('DD/MM/YYYY hh:mm A')}</Elements.DescriptionText>
          </Utils.Column>
        </Utils.Row>
        <Utils.VerticalSpacer size='big' />
        <Utils.Column>
          <Elements.Label>DESCRIPTION</Elements.Label>
          <Utils.VerticalSpacer size='xsmall' />
          <Elements.DescriptionText>
            {description}
          </Elements.DescriptionText>
        </Utils.Column>
      </Utils.Content>
    )
  }

  _copyAddress = async () => {
    await Clipboard.getString()
  }

  _showToast = (text) => {
    this.refs.addressToast.show(text)
  }

  _renderVotes = () => {
    const { votes } = this.props.navigation.state.params.item.contractData
    const TempText = styled.Text`
      font-family: Rubik-Regular;
      font-size: 11px;
      line-height: 20;
      color: white;
    `

    const votesToRender = votes.map((vote, index) => (
      <React.Fragment
        key={`${vote.voteAddress}-${index}`}
      >
        <Utils.Row justify='space-between' align='center'>
          <Copiable
            TextComponent={TempText}
            showToast={this._showToast}>
            {vote.voteAddress}
          </Copiable>
          <View style={{height: 14}}>
            <Text style={{
              fontFamily: 'Rubik-Regular',
              fontSize: 11,
              lineHeight: 20,
              color: 'white'
            }}>{vote.voteCount}</Text>
          </View>
        </Utils.Row>
        <Utils.VerticalSpacer size='medium' />
      </React.Fragment>
    ))

    return (
      <Utils.Column>
        <Utils.VerticalSpacer size='medium' />
        <Utils.Row justify='space-between'>
          <Text style={{
            fontFamily: 'Rubik-Medium',
            fontSize: 11,
            lineHeight: 11,
            letterSpacing: 0.6,
            color: rgb(116, 118, 162)
          }}>VOTED ADDRESS</Text>
          <Text style={{
            fontFamily: 'Rubik-Medium',
            fontSize: 11,
            lineHeight: 11,
            letterSpacing: 0.6,
            color: rgb(116, 118, 162)
          }}>AMOUNT</Text>
        </Utils.Row>
        <Utils.VerticalSpacer size='medium' />
        {votesToRender}
      </Utils.Column>
    )
  }

  _renderDetails = () => {
    const lowerType = this.props.navigation.state.params.item.type.toLowerCase()
    switch (lowerType) {
      case 'transfer':
        return this._renderToFrom()
      case 'vote':
        return this._renderVotes()
      case 'create':
        return this._renderCreateBody()
      case 'participate':
        return this._renderToFrom()
      default:
        return null
    }
  }

  render () {
    return (
      <Utils.Container>
        <ScrollView>
          {this._renderHeader()}
          <View style={{
            paddingHorizontal: 32
          }}>
            {this._renderCard()}
          </View>
          <View style={{
            paddingHorizontal: 32
          }}>
            <View style={{height: 24}} />
            {this._renderDetails()}
            <Toast
              ref='toast'
              position='center'
              fadeInDuration={750}
              fadeOutDuration={1000}
              opacity={0.8}
            />
          </View>
          <Toast
            ref='addressToast'
            position='center'
            fadeInDuration={750}
            fadeOutDuration={1000}
            opacity={0.8}
          />
        </ScrollView>
      </Utils.Container>
    )
  }
}

export default TransactionDetails